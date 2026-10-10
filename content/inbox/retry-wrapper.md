---
title: "重试的封装与实现"
parent: retry-decision
category: "服务治理"
tags: ["重试", "异常分类", "幂等"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**把「执行一次」作为函数传入，就可以在外层统一处理重试；错误含义和重复执行是否安全，仍由具体操作决定。** 这种在原操作外增加逻辑的方式称为包装（Wrapper）。

## 怎样分工

- 通用封装：尝试次数、退避等待、期限、取消和日志。
- 具体操作：执行一次，提供错误分类、安全重试条件和服务端等待提示。
- 上层流程：修正参数、核查未知结果、换方案或恢复任务。

包装范围应尽量小。例如「创建订单 → 发通知」在通知失败时，应恢复通知步骤，不能无条件重跑整个方法。

## Go 风格的最小流程

下面是教学伪代码，未运行，省略策略类型、辅助函数和日志实现。`op` 类型为 `func(context.Context) error`，`maxAttempts` 至少为 1，包含初次执行。

```go
for attempt := 1; attempt <= maxAttempts; attempt++ {
    if err := ctx.Err(); err != nil {
        return err
    }
    err := op(ctx)
    if err == nil {
        return nil
    }
    if attempt == maxAttempts || !canRetry(err) {
        return err
    }
    if err := wait(ctx, backoff(attempt, err)); err != nil {
        return err
    }
}
```

`canRetry` 同时检查错误是否暂时、重复执行是否安全；`backoff` 结合抖动与服务端提示；`wait` 必须支持取消，等待超过整体剩余时间时停止。总期限通过 `ctx` 传入，单次超时可在 `op` 内设置；Context 取消不能强制终止不配合的操作。

## 接入时保留的边界

操作 ID、幂等键和参数在重试间保持稳定，但 ID 本身不保证幂等。超时不等于未执行，结果未知时先核查；与[[tool-scheduling|调度器]]配合时，也不能贸然释放仍被底层操作使用的资源。

核对 SDK 是否已重试，避免[[pydantic-retries-summary|多层重试叠加]]，统一约束总预算。实际实现记录每次尝试与停止原因，并验证暂时故障恢复、永久错误停止、取消生效及写操作不重复产生副作用。
