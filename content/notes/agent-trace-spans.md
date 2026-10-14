---
learning_status: pending
parent: agent-trace
title: "Agent Trace 的 Span 创建与结束"
category: "Agent"
tags: ["Agent", "Trace", "可观测性", "埋点"]
created_at: "2026-10-13T01:06:26+08:00"
updated_at: "2026-10-13T01:35:20+08:00"
reading_suggestions:
  - trace
  - span
  - agent-trace-structure
  - eino-langfuse-tracing
  - agent-trace-verification
---

**一次操作的记录从创建 Span 开始，到填入输出或错误并结束 Span 为止。** Eino 可以自动记录模型和工具边界，应用补充根运行与自己的业务步骤。

下面使用 `labs/agent-trace/` 的实现说明，依据提交 `be79b00`、Eino v0.9.14 和 Langfuse 回调 v2.0.2。下文路径均相对于该实验仓库；代码保留实际函数边界，以 `// …` 标出省略部分，是阅读节选，不能整段替换源文件。

入口 `cmd/trace-lab/main.go` 的 `run()` 调用 `NewTelemetry`，把返回值放入 `Engine.Telemetry`，再调用 `Engine.Run`。`NewTelemetry` 位于 `internal/lab/telemetry.go`，负责创建 Provider、导出器和 Langfuse Handler。因此下面的 `e.Telemetry.Handler` 是已经配置好的处理器。

## 根 Span 在哪里创建？

一次用户任务进入 `Engine.Run` 时创建根节点。[[trace|Trace]] 是整条记录集合，根节点本身也是一个 [[span|Span]]，表示本次运行的范围。

```go
// internal/lab/run.go
func (e *Engine) Run(parent context.Context, s Scenario, version string) (r Result) {
    // …初始化 r、设置 timeout…
    ctx, cancel := context.WithTimeout(parent, timeout)
    defer cancel()
    // …给 ctx 添加实验标签…
    root := e.Telemetry.Handler.StartTrace(context.WithoutCancel(ctx),
        lf.WithName("order.after_sales"), lf.WithInput(s.Input),
        /* …Trace ID、会话、版本和 metadata… */)
    runCtx, stopRun := context.WithCancelCause(root)
    stopWatch := context.AfterFunc(ctx, func() { stopRun(context.Cause(ctx)) })
    defer stopWatch()
    defer stopRun(nil)
    root = runCtx
    // …记录根 ID 和实验标签…
    defer func() {
        // …填写耗时、脱敏输出、outcome 和 stop_reason…
        e.Telemetry.Handler.EndTrace(root, JSON(r))
    }()

    // …加载 fixture、创建 Business 和模型，组装 cfg；错误写入 r 后返回…
    agent, err := adk.NewChatModelAgent(root, cfg)
    // …处理 err…
    runner := adk.NewRunner(root, adk.RunnerConfig{
        Agent: agent, EnableStreaming: s.Streaming,
        CheckPointStore: &Store{Dir: filepath.Join(e.Dir, "checkpoints")},
    })
    // …从 s.Input、订单号、TaskID 组装 input…
    iter := runner.Run(root, []*schema.Message{schema.UserMessage(input)},
        adk.WithCheckPointID(r.TaskID), adk.WithCallbacks(e.Telemetry.Handler))
    // …定义 consume：读取事件及消息流，将输出和错误写入 r…
    interrupted := consume(iter)
    // …若 interrupted 则 Resume；归集业务结果和评分，返回 r…
}
```

`StartTrace` 返回带追踪信息的 Context，后续操作从这里取得 Trace ID 与父 Span。`EndTrace` 记录最终输出并完成根节点的生命周期。模型得到的是消息，回调得到的是执行上下文，两者不能混为一谈。

根创建后立即注册 defer，后面的提前返回也会执行 `EndTrace`；传给 Runner 的 `root` 则携带同一个根 Span。所用回调会创建新根，接入既有 HTTP Trace 时需要明确[[agent-trace-structure|跨入口的关联方式]]。

## 模型和工具 Span 需要自己创建吗？

通过上面 `runner.Run` 的 `adk.WithCallbacks(e.Telemetry.Handler)` 注册[[eino-langfuse-tracing|框架回调]]后，组件开始执行会触发开始通知，结束或失败触发对应通知。回调据此创建和结束 Span，应用不必再给每次模型请求手写一个 generation。

| 组件边界 | Langfuse 类型 | 自动记录的主要内容 |
| --- | --- | --- |
| Agent 运行 | agent | 输入、输出与终止状态 |
| 一次 ChatModel 请求 | generation | 当轮消息、响应、模型参数与组件提供的用量 |
| 一次工具执行 | tool | 参数、返回结果、错误与耗时 |

自动埋点依赖组件确实触发回调，并不覆盖任意 Go 函数。也不要同时全局注册和运行级注册同一个处理器，或把已有模型回调再包装为另一份 generation。

实验额外的 `model.request` 只记录实际请求里的消息与工具定义，用来补自动字段缺口；它没有再次调用模型。判断调用次数应看 generation 和模型调用计数，而不是把所有相关节点相加。

## 业务步骤怎样补一个 Span？

例如工具查询完成后，还要筛选内容。埋点放在 `internal/lab/business.go` 的 `labTool.InvokableRun` 内：它是 Eino 调用工具的入口，进入时 `ctx` 已携带自动工具 Span。业务先创建 `tool.execute`，再在得到原始结果后创建 `context.prepare`。

```go
// internal/lab/business.go
func (t *labTool) InvokableRun(ctx context.Context, input string, _ ...tool.Option) (string, error) {
    b := t.B
    // …解析参数，处理查询等待…
    callID := compose.GetToolCallID(ctx)
    ctx, span := Step(ctx, "tool.execute", map[string]any{
        "name": t.Name, "arguments": json.RawMessage(input), "tool_call_id": callID,
    })
    defer span.End()
    // …校验参数、执行工具、生成 raw，并记录 tool.raw_result…
    prepared := raw
    _, ps := Step(ctx, "context.prepare", map[string]any{
        "raw": json.RawMessage(raw), "strategy": "identity-v1", "tool_call_id": callID,
    })
    // …在这里加工 prepared；context 故障会把订单 A 改成 B，fixed 分支还原…
    // …保存 prepared 到业务记录…
    End(ps, json.RawMessage(prepared), nil)
    span.SetAttributes(attribute.String("langfuse.observation.output", prepared))
    return prepared, nil // 返回给 Eino，成为工具消息供后续模型使用
}
```

这里 `ctx, span := Step(...)` 将函数内的 Context 更新为 `tool.execute` 的 Context，所以后面的 `context.prepare` 归入它。加工阶段没有需要归入 `ps` 的子调用，实际代码丢弃了第二次 `Step` 返回的 Context；若在加工内部还要记录子操作，就要接住并传入那个新 Context。

`Step` 和 `End` 是同包封装，定义在 `internal/lab/telemetry.go`，不是框架自动提供的函数。下面保留完整函数体，仅调整换行：

```go
// internal/lab/telemetry.go
func Step(ctx context.Context, name string, input any) (context.Context, trace.Span) {
    return trace.SpanFromContext(ctx).TracerProvider().Tracer("trace-lab/business").Start(
        ctx, name, trace.WithAttributes(
            attribute.String("langfuse.observation.type", "span"),
            attribute.String("langfuse.observation.input", JSON(input)),
        ))
}
func End(s trace.Span, out any, err error) {
    s.SetAttributes(attribute.String("langfuse.observation.output", JSON(out)))
    if err != nil {
        s.RecordError(err)
        s.SetStatus(codes.Error, err.Error())
    }
    s.End()
}
```

`Step` 从当前 Span 取得 Provider，再以传入 Context 为父节点创建新 Span。`End` 写输出；传入非空错误时，同时记录错误事件并设置状态。实际参数校验失败的分支调用 `End(span, nil, e)` 后返回；只执行 `defer span.End()` 能关闭计时，不会自动填上错误。业务正常返回时状态可能为 Unset。输入输出采哪些字段、是否脱敏，归入[[agent-trace-capture|内容采集]]。

## 流式、取消和进程退出时，什么时候结束？

获得流式迭代器只表示开始接收结果。要消费事件、处理错误并关闭消息流，不能在返回迭代器时就结束整次运行；否则耗时、输出与后续工具步骤可能缺失。

实际 `Engine.Run` 将根记录的收尾与请求取消分开：用 `context.WithoutCancel` 创建根，再建立可取消的执行 Context，通过请求的取消事件停止运行，最后仍显式写入根结果。它保留的是完成收尾的机会，不是让模型忽略取消；测试 `TestCancelledRootPreservesFinalOutcome` 检查根输出仍有 `stop_reason=cancelled`。

Span 结束也不等于已经入库。实验关闭时使用独立的 15 秒 Context，依次 Flush、关闭回调及应用拥有的 Provider。队列和平台是否真正收到记录，需要另外做[[agent-trace-verification|采集可靠性核验]]。
