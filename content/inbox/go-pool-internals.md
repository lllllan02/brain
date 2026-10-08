---
title: "Go sync.Pool 的实现（Go 1.21）"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["Go", "sync.Pool", "源码"]
aliases: ["sync.Pool victim"]
---

**Go 1.21 的 sync.Pool 按 P 分组缓存，并在 GC 时把旧池转为 victim 缓存。**

- 本地 private 和 shared 路径减少竞争，需要时可以从其他 P 的共享队列取对象。
- 短暂 pin 只是稳定访问本地状态，不是把使用者整个处理过程绑到一个 CPU 上。
- GC 时旧池转为 victim 缓存，让短期闲置对象还有一次复用机会，再在后续周期清理。这是实现策略，不是「对象至少活过两次 GC」的保证。
- 缓存行填充用来减少 [[false-sharing|伪共享]]，也会增加元数据空间。

原阅读：[sync.Pool 的机制](https://victoriametrics.com/blog/go-sync-pool/)，历史源码：[Go 1.21.13 pool.go](https://github.com/golang/go/blob/go1.21.13/src/sync/pool.go)。
