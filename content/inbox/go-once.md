---
title: "sync.Once 怎样保证其他调用看到初始化完成？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "Once", "初始化"]
aliases: ["sync.Once"]
---

与进入 main 前的 [[go-initialization|包初始化]] 相比，Once 可把初始化推迟到首次调用。同一个 Once 只执行一次传入函数，并且并发调用 Do 的其他调用者，要等这次执行完成才能返回。因此不能只用一次 CAS 把“开始执行”标记成“已完成”，否则其他调用者可能读到尚未初始化的状态。

典型实现用原子完成标记走快速路径，再用 [[go-mutex|Mutex]] 串行化慢路径，并在持锁后再次检查。只有函数调用结束，才发布完成状态。Once 应与它保护的对象共享生命周期；每次调用都新建一个 Once 无法实现跨调用去重。

函数 panic 后，Once 也认为这次调用已经发生，后续 Do 不会自动重试。Go 1.21 引入的 OnceFunc、OnceValue、OnceValues 可缓存函数或结果；发生 panic 时，包装函数的后续调用会再次触发相同 panic。返回 error 也会被当作普通结果缓存。

需要失败后重试时，应显式维护状态和重试策略，不把 Once 当重试器。函数内部递归调用同一个 Once 的 Do 还会死锁。Once 使用后不能复制。

原阅读：[Go sync.Once](https://victoriametrics.com/blog/go-sync-once/)。合同与实现见 [sync 文档](https://pkg.go.dev/sync#Once) 和 [Go 1.21.13 once.go](https://github.com/golang/go/blob/go1.21.13/src/sync/once.go)。
