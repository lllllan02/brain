---
title: "VictoriaMetrics：Mutex：吞吐与公平的取舍"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-10"
tags: ["Go", "Mutex", "源码"]
aliases: ["Mutex 竞争", "Mutex 饥饿模式"]
parent: victoriametrics-go-concurrency
source: "[Go sync.Mutex: Normal and Starvation Mode](https://victoriametrics.com/blog/go-sync-mutex/)，VictoriaMetrics"
---

**Mutex 用正常模式保持吞吐，再在等待过久时切换到饥饿模式，避免等待者一直抢不到锁。**

## 为什么不始终按队列交接

无竞争时，原子比较交换（CAS）直接获取锁；有竞争时，慢路径按运行条件有限自旋，期待短临界区尽快结束，减少休眠与唤醒成本。仍拿不到锁才进入等待。

正常模式下，被唤醒者还要与新来者竞争。新来者已经在 CPU 上运行，往往更快，因此吞吐较好，但久等者可能反复失败。

## 怎样缓解饥饿

等待超过实现阈值后，Mutex 可转入饥饿模式：解锁者把锁交给队首，新来者排队，避免继续争抢。等待压力减轻后恢复正常模式，减少始终交接带来的吞吐损失。

原文的约 1 ms 是模式切换阈值，不是获取锁的时限保证。文章解释历史实现的取舍，基本用法见 [[go-mutex|Mutex]]。
