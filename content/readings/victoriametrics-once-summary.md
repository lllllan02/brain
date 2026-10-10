---
title: "VictoriaMetrics：Once：执行一次与完成可见性"
category: "Go"
updated_at: "2026-10-10"
tags: ["Go", "Once", "初始化"]
aliases: ["sync.Once"]
parent: victoriametrics-go-concurrency
---

**Once 不只阻止重复执行，还要保证其他调用者返回时，首次调用已经结束。**

原文：[Go sync.Once is Simple... Does It Really?](https://victoriametrics.com/blog/go-sync-once/)，VictoriaMetrics。

- 仅用 CAS 抢到执行权不够：若提前发布完成标记，其他调用者会读到未完成的初始化结果。
- 实现用原子标记走快速路径，慢路径用 Mutex 串行化并再次检查；函数结束后才发布完成状态。拆开两条路径也便于内联常用路径。
- `Do` 中函数 panic 后仍算执行过，后续不会重试；递归调用同一个 Once 会死锁。
- Go 1.21 的 `OnceFunc/OnceValue/OnceValues` 可包装函数或缓存返回值；error 同样会被缓存，panic 会在后续调用中再次触发。

因此，Once 适合 [[go-initialization|初始化]] 的延迟执行，不承担失败重试。它须与被保护对象共享生命周期，使用后不可复制；回看推导可定位原文 How it works?。
