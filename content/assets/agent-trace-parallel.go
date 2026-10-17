// 阅读节选：labs/agent-trace，提交 be79b00。
// Eino v0.9.14 / Langfuse 回调 v2.0.2；省略依赖与部分逻辑，不能独立运行。

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
