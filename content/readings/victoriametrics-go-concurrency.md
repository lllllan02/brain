---
title: "VictoriaMetrics Go 并发文章总结"
category: "Go"
tags: ["Go", "并发", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

这组总结记录 VictoriaMetrics 七篇 Go 并发文章的核心机制、设计取舍与使用边界。每篇保留原文链接；历史源码分析不代表当前所有 Go 版本，也不等于本地实测。

- [[victoriametrics-mutex-summary|Mutex]]：竞争时怎样权衡吞吐与公平。
- [[victoriametrics-waitgroup-summary|WaitGroup]]：计数与唤醒怎样衔接，为什么需要内存对齐。
- [[victoriametrics-cond-summary|Cond]]：怎样避免漏通知，为什么醒来后仍需检查条件。
- [[victoriametrics-once-summary|Once]]：怎样同时保证只执行一次与完成可见性。
- [[victoriametrics-pool-summary|Pool]]：本地缓存、伪共享与 GC 回收怎样影响对象复用。
- [[victoriametrics-sync-map-summary|sync.Map]]：旧双表怎样降低锁竞争，有哪些适用边界。
- [[victoriametrics-singleflight-summary|singleflight]]：怎样合并在途请求，取消与 Forget 有何区别。
