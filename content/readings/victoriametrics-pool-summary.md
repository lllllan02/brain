---
title: "VictoriaMetrics：Pool：对象复用与回收"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-10"
tags: ["Go", "sync.Pool", "源码"]
aliases: ["sync.Pool victim"]
parent: victoriametrics-go-concurrency
---

**Pool 用本地缓存减少分配与竞争，再借 GC 淘汰闲置对象；它是可丢弃对象的复用机制。**

原文：[Go sync.Pool and the Mechanics Behind It](https://victoriametrics.com/blog/go-sync-pool/)，VictoriaMetrics。

- 对象取出、使用、重置后归还；把非指针值装进接口可能产生额外分配，应看逃逸分析和实际分配量。
- 每个 P 有 private 与 shared 缓存；本地没有对象时尝试其他 P 的共享队列、victim，最后才调用 `New`。短暂 pin 保护本地操作，不覆盖整个使用周期。
- 相邻本地池加入填充，减少不同 CPU 修改同一缓存行造成的伪共享；代价是额外空间。
- GC 清理旧 victim，再把当前缓存转入 victim，给闲置对象一个复用缓冲期。

**限定**：原文“两次 GC”的说法是机制解释；[接口允许对象随时被移除](https://pkg.go.dev/sync#Pool)，不能保证存活时长。用法见 [[go-pool|Pool]]；原文 Pool Local & False Sharing Problem、Victim Pool 两节展开取舍。
