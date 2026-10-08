---
title: "Go sync.Once"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "Once", "初始化"]
aliases: ["sync.Once"]
---

**Once 承诺同一件事只做一次，并且其他并发调用会等它做完才返回。** 所以不能只用一次 CAS 把「开始执行」标成「已完成」，否则其他调用者可能读到还没初始化好的状态。相比进入 main 前的 [[go-initialization|包初始化]]，Once 可以把初始化推迟到首次调用。

典型实现用原子完成标记走快速路径，再用 [[go-mutex|Mutex]] 串行化慢路径，持锁后再检查一次，只有函数调用结束才发布完成状态。Once 要和它保护的对象共享生命周期；每次调用都新建一个 Once 无法实现跨调用去重。

**函数 panic 后，Once 也认为这次调用已经发生**，后续 Do 不会自动重试。Go 1.21 引入的 OnceFunc、OnceValue、OnceValues 可缓存函数或结果；函数 panic 时，包装函数的后续调用会再次触发同样的 panic，返回的 error 也会被当成普通结果缓存。

需要「失败后重试」时应显式维护状态和重试策略，别把 Once 当重试器。函数内部递归调用同一个 Once 的 Do 还会死锁。Once 用过之后不能复制。

原阅读：[Go sync.Once](https://victoriametrics.com/blog/go-sync-once/)。合同与实现见 [sync 文档](https://pkg.go.dev/sync#Once) 和 [Go 1.21.13 once.go](https://github.com/golang/go/blob/go1.21.13/src/sync/once.go)。
