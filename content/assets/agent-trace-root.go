// 阅读节选：labs/agent-trace，提交 be79b00。
// Eino v0.9.14 / Langfuse 回调 v2.0.2；省略依赖与部分逻辑，不能独立运行。

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
