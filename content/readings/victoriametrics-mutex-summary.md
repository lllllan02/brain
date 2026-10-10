---
title: "VictoriaMetrics：Mutex：吞吐与公平的取舍"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-10"
tags: ["Go", "Mutex", "源码"]
aliases: ["Mutex 竞争", "Mutex 饥饿模式"]
parent: victoriametrics-go-concurrency
---

**Mutex 通过快速路径降低无竞争开销，再在正常模式与饥饿模式之间切换，兼顾吞吐和长时间等待者。**

原文：[Go sync.Mutex: Normal and Starvation Mode](https://victoriametrics.com/blog/go-sync-mutex/)，VictoriaMetrics。

- 状态字同时记录锁定、唤醒、饥饿标志和等待者数量；信号量负责休眠与唤醒。
- 无竞争时尝试 CAS；慢路径按运行条件有限自旋，避免短临界区也立即付出休眠、唤醒成本。
- 正常模式下，被唤醒者仍需和新来者竞争，新来者已在运行，可能更快拿到锁。
- 等待过久时转入饥饿模式，解锁者将锁交给队首；等待压力减轻后恢复正常模式，避免始终交接带来的吞吐损失。

文中的约 1 ms 是实现阈值，不是等待时限保证。基本使用见 [[go-mutex|Mutex]]；回看实现可定位原文 Mutex Lock Flow 与 Mutex Unlock Flow。
