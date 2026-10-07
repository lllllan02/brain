---
title: "sync.Pool 能复用什么，为什么不能当连接池？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "sync.Pool", "内存复用"]
type: "concept"
aliases: ["sync.Pool"]
---

sync.Pool 用于复用可随时丢弃、重新创建的临时对象，减少分配与 GC 压力。Get 不保证返回之前 Put 的对象，运行时也可以移除池中对象，所以它不能承担必须关闭的连接、文件或固定容量资源的生命周期管理。

借出对象后由当前使用者负责，Put 后不能继续访问，也不能把仍被外部引用的缓冲区放回池。Pool 本身并发安全，不意味着借出的对象可以无同步共享。放回前应清理业务状态；特别大的缓冲区可按明确阈值丢弃，防止一次异常请求扩大长期占用。

New 应在使用前配置。没有 New 时 Get 可能返回 nil；接口中装有类型的 nil 指针还涉及 [[go-interfaces|typed nil]]。复用指针通常更便于控制装箱，但具体是否分配仍需测量。

## 为什么使用本地池与 victim

Go 1.21 的实现把缓存按 P 分组，本地 private 与 shared 路径减少竞争，需要时可从其他 P 的共享队列取对象。短暂 pin 用来稳定访问本地状态，不是把使用者整个处理过程绑定在一个 CPU 上。

GC 时旧池可转为 victim 缓存，让短期闲置对象还有复用机会，再在后续周期清理。这是实现策略，不是保证对象至少活过两次 GC。缓存行填充用于减少 [[false-sharing|伪共享]]，也会增加元数据空间。

先测分配率和实际收益，再决定是否引入池。原阅读：[sync.Pool 的机制](https://victoriametrics.com/blog/go-sync-pool/)，历史源码：[Go 1.21.13 pool.go](https://github.com/golang/go/blob/go1.21.13/src/sync/pool.go)。
