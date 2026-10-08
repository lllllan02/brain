---
title: "Go singleflight（请求合并）"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "singleflight", "缓存击穿"]
aliases: ["请求合并", "singleflight"]
---

**singleflight 让同一 Group 内、同一个 key 的重叠调用共享一次执行结果。** 执行结束后后续请求可以重新执行，所以它是并发请求合并机制，不做长期缓存，也不跨进程协调。

典型用途是在 [[cache-overload-protection|缓存击穿]] 时合并回源。key 必须覆盖会影响结果的条件，包括租户、参数和权限范围；把不等价请求合并，会返回错误甚至越权的数据。Group 要被相关请求共享，每个请求新建 Group 没有效果。

`Do` 等待结果，`DoChan` 返回可等待的结果 channel（不会被关闭）。shared 表示结果被多个调用共享，执行函数的那一个调用也可能得到 true，不能用它判断谁是执行者。

## 等待者取消与执行取消不同

等待者可以 select 自己的 context，超时后停止等待；这不会自动取消共享函数。如果共享函数直接用第一个请求的 context，第一个请求离开就可能让所有等待者失败。应按业务决定共享任务的独立超时、引用计数取消或其他生命周期。

Forget 让未来同 key 调用不再等待旧任务，但不取消旧任务，也不改变已在等待的调用，因此可能出现同 key 的重叠执行。不同 key 的函数可以并行执行，库中登记任务用的锁不覆盖整个业务函数。

原阅读：[Go Singleflight](https://victoriametrics.com/blog/go-singleflight/)，接口边界：[x/sync/singleflight](https://pkg.go.dev/golang.org/x/sync/singleflight)。
