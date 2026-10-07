---
title: "WaitGroup 怎样等待一组任务，为什么 Add 的位置重要？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "WaitGroup", "并发"]
aliases: ["sync.WaitGroup"]
---

WaitGroup 维护未完成任务计数，Wait 等到计数归零。它只解决“任务是否结束”，不会自动保护任务间共享数据，也不提供错误传播或取消。

传统用法是在启动 goroutine 前 Add，在任务退出时 Done，最后 Wait。计数为零时，增加新任务必须先于对应的 Wait；把 Add 放进刚启动的 goroutine，可能让 Wait 先看到零并提前返回。任务内用 defer Done 可以覆盖普通返回和 panic 展开，但不能让未恢复的 panic 变得安全。

Go 1.25 增加了 `WaitGroup.Go`，可统一启动和计数；其函数不能 panic，使用时应检查项目版本和相应合同。[WaitGroup 文档](https://pkg.go.dev/sync#WaitGroup)

WaitGroup 使用后不能复制。复用下一批任务前，要确保上一批所有 Wait 都已经返回。若需要取消尚未完成的任务，应另外传递 [[go-context|context]]；等待取消信号不等于已经回收全部 goroutine。

## 计数与唤醒如何衔接

Go 1.21 使用原子状态组合任务计数与等待者数量，计数降为零时唤醒等待者。把两个数字放在一致更新的状态里，可以协调“准备等待”和“最后一个任务完成”的竞争。

64 位原子状态还涉及部分平台的对齐要求，`atomic.Uint64` 帮助实现正确对齐。字段布局属于版本实现，不应通过 unsafe 读取它判断任务进度。

原阅读：[WaitGroup 与对齐问题](https://victoriametrics.com/blog/go-sync-waitgroup/)，历史实现：[Go 1.21.13 waitgroup.go](https://github.com/golang/go/blob/go1.21.13/src/sync/waitgroup.go)。
