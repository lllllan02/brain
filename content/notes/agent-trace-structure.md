---
learning_status: pending
parent: agent-trace
title: "Agent Trace 的调用关联与并行记录"
category: "Agent"
tags: ["Agent", "Trace", "埋点"]
created_at: "2026-10-12T23:28:23+08:00"
updated_at: "2026-10-13T01:35:20+08:00"
---

**Trace ID 归并一次运行，Parent Span ID 表达步骤包含关系；并行分支从同一个父 Context 开始，重试则为每次尝试保留独立记录。** 执行先后和模型提出的工具关系不能单靠父子树表达。

这里沿用 `labs/agent-trace/` 的订单助手。单个节点的 API 和生命周期由[[agent-trace-spans|Span 创建与结束]]说明，本文关注节点之间怎样关联。

## 模型提出工具调用，工具就属于模型 Span 吗？

模型响应中包含工具名称、参数和调用 ID，框架随后才真正执行工具。两者属于同一轮编排，但工具不是模型服务在请求内部执行的操作。实验中的关系片段是：

```text
ReAct
├─ ChatModel：生成调用提议
├─ ToolNode
│  ├─ get_order
│  ├─ get_shipping
│  └─ search_policy
└─ ChatModel：接收工具结果后继续
```

| 标识 | 解决的问题 |
| --- | --- |
| Trace ID | 这些操作是否属于同一次追踪？ |
| Span ID、Parent Span ID | 哪个操作包含哪个子操作？ |
| tool_call_id | 这份工具结果对应模型的哪条提议？ |
| attempt | 同一逻辑操作的第几次实际尝试？ |
| task_id、session_id | 多次运行是否属于同一任务或会话？ |

实验工具用 `compose.GetToolCallID(ctx)` 取得调用 ID，写入 `tool.execute`；原始结果和加工结果继续携带它。不能仅凭工具同名或时间接近来配对响应。

## 并行时怎样传 Context？

实验在 `internal/lab/run.go` 的 `Engine.Run` 中，把 `b.Tools()` 放入 `ChatModelAgentConfig.ToolsConfig.ToolsNodeConfig.Tools`，再创建 Agent 和 Runner。因此并行调度发生在 Eino 的 ToolNode 内，应用不必在 `Engine.Run` 再起 goroutine。

实际使用的本地依赖位于 `third_party/eino/compose/tool_node.go`。其中 `parallelRunToolCall` 接收当前 ToolNode 的 Context、执行函数 `run` 和本轮任务 `tasks`；关键部分如下，省略单任务快捷路径、已执行任务判断和 panic 处理：

```go
// third_party/eino/compose/tool_node.go
func parallelRunToolCall(ctx context.Context,
    run func(ctx2 context.Context, callTask *toolCallTask, opts ...tool.Option),
    tasks []toolCallTask, opts ...tool.Option) {
    // …只有一个任务时直接 run 后返回…
    var wg sync.WaitGroup
    for i := 1; i < len(tasks); i++ {
        // …跳过已执行任务…
        wg.Add(1)
        go func(ctx_ context.Context, t *toolCallTask, opts ...tool.Option) {
            defer wg.Done()
            // …panic 转为该任务的错误…
            run(ctx_, t, opts...)
        }(ctx, &tasks[i], opts...)
    }
    if !tasks[0].executed {
        run(ctx, &tasks[0], opts...)
    }
    wg.Wait()
}
```

任务 0 在当前 goroutine 执行，其余任务在新 goroutine 执行；所有分支传入同一个父 `ctx`。`run` 在非流式路径对应同文件的 `runToolCallTaskByInvoke`：它复用回调、写入各自的工具调用 ID，再进入带回调的工具入口。回调为各工具建立自己的 Span，最终调用应用的 `labTool.InvokableRun`。因此自动工具 Span 是兄弟关系，工具内部业务 Span 再由各自的 Context 向下创建，具体位置见[[agent-trace-spans|业务步骤埋点]]。

这里的共享是传入同一个父 Context，不是在共享变量中反复覆盖它。若自行编写并行函数，也要让各分支分别创建并使用自己的子 Context，不能让第二支继承第一支的新 Context，或改用 `context.Background()` 丢掉关联。`wg.Wait()` 则保证汇合之后才继续处理工具结果。

## 怎样确认真的并行，而非只是提出了两个工具？

normal/fixed 的实际导出中，两个工具的父 Span 都是 `a2cef32c8d03278d`：

| 工具 | 开始时间（本地） | 结束时间（本地） |
| --- | --- | --- |
| get_order | 00:38:17.640332 | 00:38:17.661483 |
| get_shipping | 00:38:17.640342 | 00:38:17.661480 |

两段时间重叠，证明这次观测到的执行是并行的。模型同时提出两个工具只能证明提议包含并行机会，不能替代执行证据。父步骤耗时已包含子步骤，不能把父子耗时相加；并行工具约各 21 毫秒，也不能据此说它们占用了 42 毫秒的串行等待。具体观察方法见[[agent-trace-viewing|Langfuse 的时间线查看]]。

## 重试要覆盖旧节点，还是新增？

每次尝试新增 Span，保留相同逻辑调用标识和不同 attempt。实验 retry/fixed 的两个 `tool.attempt` 分别是 `attempt=1 / Error` 与 `attempt=2 / Unset`；运行最终成功，第一次失败仍存在。这个场景由程序主动构造失败／恢复，演示的是记录方式，并未请求外部存储两次。

模型重试则通过 `ModelRetryConfig.ShouldRetry` 拒绝第一份真实响应，再次调用模型；`model.retry_decision` 记录原因，两次 generation 保留各自输入输出。重试通知数不等于真实请求次数，应核对调用边界。

## 跨请求、审批恢复怎样关联？

普通跨服务传播按 [[otel-trace-collection|OTel Context 传播]]：发送方注入 `traceparent`，接收方提取后再创建子 Span。实验 HTTP 入口虽提取了它，Langfuse 回调 v2.0.2 的 `StartTrace` 仍会创建新根；代码将原请求 Trace/Span ID 写入 metadata。这是两棵树的显式关联，不是延续同一棵树。

实验的审批中断随即在同进程里 `Runner.Resume`，沿用运行根，因此 normal/fixed 有两个 Agent observation；`checkpoint.resume` 的 Context 未传入 Resume，它与恢复的 Agent 是兄弟节点。节点叫“恢复”不代表它自动成为恢复操作的父节点。

如果等待数小时或跨进程再执行，可以另起 Trace，保留 task_id、检查点 ID，并按 SDK 支持添加 Span Link。Link 表示关联而非父子；实际恢复依赖[[agent-checkpoint-recovery|检查点机制]]，Trace 本身不提供执行状态。
