---
title: "Go sync.Pool"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "sync.Pool", "内存复用"]
aliases: ["sync.Pool", "对象池"]
---

**sync.Pool 是一个临时对象池，用来复用运行中可随时丢弃、需要时重建的对象，减少分配和 GC 压力。**

## 怎么用

- `Get` 取一个对象（池中没有就调用 `New` 新建，没设 `New` 时可能返回 nil）；用完 `Put` 回去。
- **Get 不保证拿回你之前 Put 的那个**，运行时也可能清空缓存——所以它不能承担必须关闭的连接、文件或有固定容量资源的生命周期，不能当连接池。
- 借出后由当前使用者负责，Put 之后不能再访问，也不能把仍被外部引用的缓冲区放回池；放回前清理业务状态。
- Pool 本身并发安全，不表示借出的对象可以无同步共享。
- 接口里装着一个类型化的 nil 指针还涉及 [[go-interfaces|typed nil]]。

接口：[sync.Pool](https://pkg.go.dev/sync#Pool)。本地池与 victim 的实现见 [[go-pool-internals|sync.Pool 的实现（Go 1.21）]]。
