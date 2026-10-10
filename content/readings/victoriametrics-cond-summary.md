---
title: "VictoriaMetrics：Cond：等待条件与通知"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-10"
tags: ["Go", "sync.Cond", "源码"]
aliases: ["Cond notifyList"]
parent: victoriametrics-go-concurrency
source: "[Go sync.Cond, the Most Overlooked Sync Mechanism](https://victoriametrics.com/blog/go-sync-cond/)，VictoriaMetrics"
---

**Cond 把检查条件、释放锁和等待通知衔接起来；通知只意味着可以重新检查，不保证条件已经成立。**

## 为什么醒来还要循环检查

调用者持锁检查条件，不满足就 `Wait`。`Wait` 释放锁并等待通知，返回前重新取得锁；这期间其他 goroutine 可能先修改状态，所以仍要在循环中检查条件。

`Signal` 通知一个等待者，`Broadcast` 通知当前全部等待者。它们不为尚未登记的未来等待者积存通知，广播也不同于永久关闭一个 channel。

## 怎样避免解锁后漏掉通知

`Wait` 先领取票号、登记等待，再释放锁。若通知恰好在真正入队和休眠前到达，等待者会发现自己的票号已被通知，跳过休眠。因此，“登记后、入睡前”的间隙不会吞掉这次通知。

票号分配、入队与实际运行顺序可能不同，不能由此推出公平调度承诺。理解这条机制后，再结合 [[go-cond|Cond 用法]]看持锁检查循环。
