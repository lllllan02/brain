---
title: "VictoriaMetrics：WaitGroup：计数、唤醒与对齐"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-10"
tags: ["Go", "WaitGroup", "源码"]
aliases: ["WaitGroup 实现"]
parent: victoriametrics-go-concurrency
---

**WaitGroup 的难点是让任务计数变化与等待者登记保持一致，而 64 位原子状态又带来了跨平台对齐问题。**

原文：[Go sync.WaitGroup and The Alignment Problem](https://victoriametrics.com/blog/go-sync-waitgroup/)，VictoriaMetrics。

- 原文实现把任务计数与等待者数量放入同一个 64 位状态；`Add/Done` 更新计数，`Wait` 登记等待者，计数归零后唤醒。
- 分开更新两个数字会增加同步难度；组合成一个原子状态，可以一致地观察和修改两者。
- 某些 32 位平台要求手工保证 64 位原子操作的对齐。文章回顾了预留空间、重排字段，到 Go 1.20 使用 `atomic.Uint64` 的演进。
- `noCopy` 辅助静态检查，不能当作运行时阻止复制的机制；计数为负及错误复用仍属于调用方问题。

先登记任务再启动 goroutine，上一批等待结束后才复用，见 [[go-waitgroup|WaitGroup 用法]]。源码布局是历史实现；原文对齐与内部机制两节解释了设计原因。
