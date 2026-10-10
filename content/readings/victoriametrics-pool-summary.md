---
title: "VictoriaMetrics：Pool：对象复用与回收"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-10"
tags: ["Go", "sync.Pool", "源码"]
aliases: ["sync.Pool victim"]
parent: victoriametrics-go-concurrency
source: "[Go sync.Pool and the Mechanics Behind It](https://victoriametrics.com/blog/go-sync-pool/)，VictoriaMetrics"
---

**Pool 通过分散的本地缓存复用临时对象，降低分配与竞争，再让 GC 淘汰闲置对象。**

## 为什么按 P 保存对象

Go 调度器的每个 P 各有 private 与 shared 缓存，避免所有获取、归还操作都争抢同一个全局结构。本地不足时还会尝试其他 P 的共享缓存及 victim，最后才需要 `New` 创建对象。

本地池之间加入填充，减少不同 CPU 修改同一缓存行造成的伪共享，代价是额外空间。短暂的 pin 保护本地操作，不覆盖对象的整个使用周期。

## GC 为什么不一次清空

GC 清理旧 victim，再把当前缓存转入 victim，让对象保留一段复用机会，避免每次 GC 后都立即重新分配。不过原文“两次 GC”是机制解释；[接口允许对象随时被移除](https://pkg.go.dev/sync#Pool)，不承诺存活时长。

[[go-pool|Pool]]适合可重新创建的临时对象。归还前应重置状态；是否实际减少分配，还需结合逃逸分析与测量判断，不能仅凭使用了 Pool 就认定更快。
