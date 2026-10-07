---
title: "Go Mutex 怎样在竞争吞吐和等待公平之间取舍？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "Mutex", "并发"]
type: "concept"
aliases: ["sync.Mutex", "读写锁"]
---

Mutex 保护一组必须一起成立的状态约束。所有访问者都应遵守同一加锁协议；只锁写入、不锁读取，或者把读取和修改分开加锁，都可能破坏约束。

Mutex 的零值可以使用，使用后不能复制，不可重入。同一 goroutine 再次 Lock 自己持有的锁会阻塞；Go 的 Mutex 不绑定 goroutine 身份，可以由另一个 goroutine 解锁，但程序必须明确交接协议。RWMutex 也不支持直接从读锁升级为写锁，读多是否更快需要测量。

## Go 1.21 的竞争处理

无竞争时，快速路径通过原子操作取得锁。竞争路径结合有限自旋与休眠：锁可能很快释放时短暂等待，继续竞争无益时挂起，避免长期浪费 CPU。这个思路与 [[lock-implementation|自旋和阻塞锁]] 相同。

正常模式下，被唤醒的等待者仍要与新到达的 goroutine 竞争，新到达者可能因为已在 CPU 上运行而先取得锁。等待过久会触发饥饿模式，使锁优先交给排队者；等待压力解除后再回到正常模式。

源码中的约 1 ms 阈值是切换策略，不是“1 ms 内必定获得锁”的承诺，也不能推出严格 FIFO。持锁期间进行慢 I/O，会直接拉长所有等待者的延迟；应先缩小临界区，避免在锁内执行不受控工作。

原阅读：[VictoriaMetrics 的 Mutex 分析](https://victoriametrics.com/blog/go-sync-mutex/)。实现对照 [Go 1.21.13 sync/mutex.go](https://github.com/golang/go/blob/go1.21.13/src/sync/mutex.go)。
