// 阅读节选：labs/agent-trace，提交 be79b00。
// Eino v0.9.14 / Langfuse 回调 v2.0.2；省略依赖与部分逻辑，不能独立运行。

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
