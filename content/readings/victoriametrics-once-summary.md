---
title: "VictoriaMetrics：Once：执行一次与完成可见性"
category: "Go"
updated_at: "2026-10-10"
tags: ["Go", "Once", "初始化"]
aliases: ["sync.Once"]
parent: victoriametrics-go-concurrency
source: "[Go sync.Once is Simple... Does It Really?](https://victoriametrics.com/blog/go-sync-once/)，VictoriaMetrics"
---

**Once 的保证包含两部分：函数只执行一次，其他调用者返回时这次执行也已经结束。**

## 为什么一个 CAS 标记不够

如果抢到执行权就把标记设成“完成”，其他 goroutine 会直接返回，却可能读到尚未初始化的数据。原文实现先用原子标记提供快速路径，未完成时进入锁保护的慢路径，再次检查并执行函数，结束后才发布完成状态。

锁让并发调用者等到执行结束；快速路径则降低初始化完成后反复调用的成本。

## 失败也可能被记住

`Do` 的函数发生 panic 后仍算执行过，之后不会重试；递归调用同一个 Once 会死锁。Go 1.21 的 `OnceFunc/OnceValue/OnceValues` 可包装函数与缓存返回值，其中 error 也会被缓存，panic 会在后续调用时再次触发。

因此它适合[[go-initialization|一次性初始化]]，不承担失败重试；Once 应与被保护对象共享生命周期，使用后不可复制。
