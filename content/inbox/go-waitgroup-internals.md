---
title: "Go WaitGroup 的实现细节"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["Go", "WaitGroup", "源码"]
aliases: ["WaitGroup 实现"]
---

**WaitGroup 用一份 64 位原子状态同时保存任务计数和等待者数量。**

Go 1.21 把这两个数字放在同一个原子状态里一致更新：计数降为零时唤醒等待者。两个数字一致更新，才能协调「准备 Wait」和「最后一个任务完成」之间的竞争——否则可能漏唤醒，或者让 Wait 提前返回。

64 位原子状态在部分平台有对齐要求，`atomic.Uint64` 帮助实现正确对齐。字段布局属于版本实现，不要用 unsafe 去读它判断任务进度。

原阅读：[WaitGroup 与对齐问题](https://victoriametrics.com/blog/go-sync-waitgroup/)，历史实现：[Go 1.21.13 waitgroup.go](https://github.com/golang/go/blob/go1.21.13/src/sync/waitgroup.go)。
