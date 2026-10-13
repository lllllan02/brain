---
learning_status: understood
title: "重试的封装与实现"
parent: retry-decision
category: "服务治理"
tags: ["重试", "异常分类", "幂等"]
created_at: "2026-10-10"
updated_at: "2026-10-12T11:21:40+08:00"
---

**重试包装器（Retry Wrapper）接收一个「执行一次」的函数，在外层统一完成判断、等待、再次调用和停止。** 调用方仍获得一个结果或错误，不必在每个查询、工具函数里重复写循环。

## 包装器与业务怎样分工？

- 单次操作 `op`：执行一次，返回结果或错误，并响应取消。
- 业务策略 `Policy`：按[[retry-decision|重试决策]]判断是否可安全再试，提供次数上限和等待时间。
- 包装器 `Retry`：调用、判断、等待与停止；修正参数、核查未知结果和换方案留给上层。

**「只包装需要重做的部分」**：例如创建订单成功、发通知失败，就只恢复通知，并防止通知重复发送。

## 包装器内部怎样实现？

![[assets/retry-wrapper-mechanism.png|调用方只调用一次，包装器内部循环执行、检查和等待，最终返回结果或错误]]

以下为 Go 1.20+ 标准库实现，已通过编译检查，未做行为测试。Context 的总期限覆盖执行与等待。

```go
package retry

import (
	"context"
	"errors"
	"fmt"
	"time"
)

type Policy struct {
	MaxAttempts int              // 包含首次执行，必须大于 0
	CanRetry    func(error) bool // 错误可恢复，且操作可安全重复
	Delay       func(attempt int, err error) time.Duration
}

func Retry[T any](ctx context.Context, op func(context.Context) (T, error), p Policy) (T, error) {
	var result T
	var lastErr error
	if p.MaxAttempts < 1 || op == nil || p.CanRetry == nil || p.Delay == nil {
		return result, errors.New("无效的重试配置")
	}
	for attempt := 1; ; attempt++ {
		// 首次执行及每次重试前，都检查取消与总期限。
		if err := ctx.Err(); err != nil {
			return result, errors.Join(err, lastErr)
		}
		result, lastErr = op(ctx)
		if lastErr == nil {
			return result, nil
		}
		if err := ctx.Err(); err != nil {
			return result, errors.Join(err, lastErr)
		}
		if !p.CanRetry(lastErr) {
			return result, fmt.Errorf("不再重试: %w", lastErr)
		}
		if attempt >= p.MaxAttempts {
			return result, fmt.Errorf("尝试次数耗尽: %w", lastErr)
		}
		delay := p.Delay(attempt, lastErr)
		if delay < 0 {
			return result, fmt.Errorf("等待时间不能为负: %w", lastErr)
		}
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return result, errors.Join(ctx.Err(), lastErr)
		case <-timer.C:
			// 回到循环开头，再次调用同一个 op。
		}
	}
}
```

`CanRetry` 同时考虑错误语义和操作安全性；`Delay` 结合有上限的退避、抖动与服务端提示。取消时保留取消原因和最后一次操作错误。

## 调用方怎样使用？

把已有单次查询函数和业务策略传入：

```go
ctx, cancel := context.WithTimeout(parentCtx, 3*time.Second)
defer cancel()

result, err := Retry(ctx, queryOnce, Policy{
    MaxAttempts: 3,
    CanRetry:    canRetryQuery,
    Delay:       retryDelay,
})
```

这是接入片段，`queryOnce`、`canRetryQuery` 和 `retryDelay` 由业务提供，时间与次数仅作示例。完整工程可采用[[go-backoff-retry-summary|Go backoff]]，补充尝试日志与结构化停止原因。

## 重试安全由谁保证？

**「包装器负责再次执行，[[idempotency|幂等机制]]负责避免重复生效。」** 同一次业务操作按接口约定沿用幂等键和参数；写请求超时先核查，不能假定原操作没有成功。

事务同样需要考虑重试安全。事务保证一次提交内的原子性，**不自动识别两次提交是否属于同一业务意图**：一次扣款事务已提交但响应丢失，重跑仍可能再次扣款。可将唯一操作记录与业务变更放进同一事务，重复请求读取已有结果；事务回滚也不会撤销已发生的远程副作用。具体约束见[[idempotency|幂等的实现与边界]]。

取消要传到底层操作，包装器无法强制终止不响应 Context 的调用；与[[tool-scheduling|调度器]]配合时，也不能提前释放仍在使用的资源。接入前核对 SDK 自带的重试，避免[[pydantic-retries-summary|多层次数相乘]]；模型修正和任务恢复交给[[agent-retry|Agent 重试]]的上层流程。
