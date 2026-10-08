---
title: "Go Mutex 的竞争处理"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["Go", "Mutex", "源码"]
aliases: ["Mutex 竞争", "Mutex 饥饿模式"]
---

**Mutex 在无竞争时走原子快速路径，竞争时结合有限自旋和休眠，等待过久则切到饥饿模式。**

- 无竞争：快速路径用一次原子操作拿锁。
- 竞争路径：锁可能很快释放时短暂自旋，继续自旋没收益就挂起，避免长期空耗 CPU。这和自旋锁与阻塞锁是同一思路。
- 正常模式下，被唤醒的等待者还要和新到达的 goroutine 竞争，新到达者可能因为已经在 CPU 上运行而抢先。
- **饥饿模式**：等待过久会切过去，让锁优先交给排队者；等待压力解除后再回到正常模式。

源码里约 1 ms 的阈值是切换策略，不是「1 ms 内必定拿到锁」的承诺，也推不出严格 FIFO。

原阅读：[VictoriaMetrics 的 Mutex 分析](https://victoriametrics.com/blog/go-sync-mutex/)。实现对照 [Go 1.21.13 sync/mutex.go](https://github.com/golang/go/blob/go1.21.13/src/sync/mutex.go)。
