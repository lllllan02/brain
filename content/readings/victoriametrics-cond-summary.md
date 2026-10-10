---
title: "VictoriaMetrics：Cond：等待条件与通知"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-10"
tags: ["Go", "sync.Cond", "源码"]
aliases: ["Cond notifyList"]
parent: victoriametrics-go-concurrency
---

**Cond 将条件检查、释放锁和等待通知衔接起来，避免忙等，也避免在解锁与进入等待之间漏掉通知。**

原文：[Go sync.Cond, the Most Overlooked Sync Mechanism](https://victoriametrics.com/blog/go-sync-cond/)，VictoriaMetrics。

- 使用流程是持锁检查条件，不满足就 `Wait`；返回后重新持锁检查，因此要用循环，通知本身不保证条件仍成立。
- `Signal` 通知一个等待者，`Broadcast` 通知当前全部等待者；与关闭 channel 不同，广播可以重复使用。通知不会被无限储存给未来的等待者。
- `Wait` 先取得票号，再解锁。真正休眠前会检查票号是否已被通知，补上“通知先到、等待者后入队”的间隙。
- 票号、入队和实际运行顺序可能不同；源码机制不能推出公平调度承诺。`copyChecker` 通过地址变化检测使用后的复制。

文章的核心是理解“通知意味着重新检查”，用法可结合 [[go-cond|Cond 知识卡]]。源码细节见原文的 How It Works Internally。
