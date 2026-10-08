---
title: "Go Cond 的等待队列"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["Go", "sync.Cond", "源码"]
aliases: ["Cond notifyList"]
---

**Cond 的 runtime 实现用 notifyList，避免「已登记等待、但还没入队时通知就到了」的丢通知问题。**

Wait 先取一个票号，再解锁并尝试进入等待队列。Signal 推进已通知的票号范围；等待者真正入队前若发现自己的票号已被覆盖，就直接继续，不必再睡眠。这样即使通知发生在入队之前，也不会丢。

票号顺序不等于入队顺序，也不等于 goroutine 最终运行顺序。copyChecker 记录自身地址，用来检测「使用后复制」。这些都是具体源码实现，不是业务可依赖的调度保证。

原资料：[VictoriaMetrics 的 sync.Cond 解析](https://victoriametrics.com/blog/go-sync-cond/)。
