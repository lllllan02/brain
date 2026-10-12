---
title: "Go backoff：用函数包装一次操作"
parent: retry-wrapper
category: "服务治理"
tags: ["重试", "异常分类"]
created_at: "2026-10-12T11:09:12+08:00"
updated_at: "2026-10-12T11:09:12+08:00"
source: "[backoff v7.0.0 源码](https://github.com/cenkalti/backoff/blob/v7.0.0/retry.go) · [包文档](https://pkg.go.dev/github.com/cenkalti/backoff/v7)"
---

**backoff 把一次操作表示为返回结果与错误的函数，外层 `Retry` 负责再次调用、等待和停止。** 本文按 v7.0.0 源码核对，该版本要求 Go 1.23 或以上；不混用其他主版本接口。

## 操作怎样表达重试意图

`Operation[T]` 是 `func() (T, error)`。返回 `nil` 错误表示成功；普通错误会进入重试策略，`Permanent(err)` 表示本轮不再尝试。业务必须先识别可恢复错误，库不会判断接口权限、幂等性或副作用。

`RetryAfterError` 可指定下次间隔，并重置退避策略；仍受次数与时间约束。原始错误和停止原因由 `RetryError.LastErr`、`Cause` 分别保存。

## 次数、时间与取消怎样配合

`WithMaxTries(3)` 包含首次执行，最多重试两次。默认指数退避带随机扰动，每个并发调用应使用独立的有状态退避实例。

`WithMaxElapsedTime` 在两次尝试之间检查，不能中断正在执行的操作；设为 0 可禁用它，改用带期限的 Context。Context 可打断等待，但业务操作还需自己接收并遵守 Context，才能响应执行中的取消。

源码先调用操作再检查循环中的取消条件，保证至少调用一次；不能依赖外层 Context 阻止第一次业务动作，应在操作内检查并向下游传递 Context。

## 哪些信息适合记录

`WithNotify` 只在失败后确定还会重试时回调，不包含最终停止事件。日志需分别记录尝试失败与最终返回，避免只知道“曾经重试”，不知道为何结束。具体用法见[[retry-wrapper|重试的封装与实现]]。
