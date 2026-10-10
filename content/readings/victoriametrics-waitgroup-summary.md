---
title: "VictoriaMetrics：WaitGroup：计数、唤醒与对齐"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-10"
tags: ["Go", "WaitGroup", "源码"]
aliases: ["WaitGroup 实现"]
parent: victoriametrics-go-concurrency
source: "[Go sync.WaitGroup and The Alignment Problem](https://victoriametrics.com/blog/go-sync-waitgroup/)，VictoriaMetrics"
---

**WaitGroup 要同时处理“还剩多少任务”和“有多少人在等待”；原文用合并的原子状态解释唤醒机制，再追溯跨平台对齐问题。**

## 计数如何与等待衔接

原文实现把任务计数与等待者数量放入同一个 64 位状态。`Add/Done` 更新任务计数，`Wait` 登记等待者，计数归零时再唤醒。组合状态使两个数字能被一致地观察和修改，避免把相关变化拆成互相竞争的独立更新。

## 为什么布局反复变化

部分 32 位平台上的 64 位原子操作要求 8 字节对齐，普通字段布局未必满足。文章回顾了预留额外空间、重排字段，到 Go 1.20 改用 `atomic.Uint64` 保证对齐的演进。

这解释的是“为什么内部结构这样安排”，不是新的调用方式。[[go-waitgroup|使用时]]仍需先登记任务再启动 goroutine，上一批等待结束后才复用；`noCopy` 仅辅助静态检查，不在运行时阻止复制。源码布局须按原文版本理解。
