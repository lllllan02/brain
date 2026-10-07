---
title: "Go GC 的暂停很短，为什么请求仍可能变慢？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "GC", "延迟", "Mark Assist"]
---

短 STW 只能说明全局暂停较短，不能证明 GC 对请求没有影响。并发标记会消耗 CPU，分配中的 mark assist 还可能让业务 goroutine 承担扫描或等待工作。

## 分配为什么会带来辅助工作

如果业务分配内存的速度超过后台标记推进的速度，运行时会按分配量计入辅助债务。分配的 goroutine 可能需要帮助标记，或等待可用的后台标记进度，才能继续运行。这样能约束分配与回收之间的节奏，但不能保证程序永远不会 OOM。

因此，同样只有很短的 STW，一个分配密集的请求仍可能在本次请求内多次承担 GC 工作。后台扫描还会与业务争用 CPU，清扫和内存管理也不是完全没有成本。

## 怎样区分相关与因果

把请求慢的时间段与 GC 周期、分配速率、存活堆、CPU 配额放在一起看，再用 execution trace 观察暂停、调度与辅助工作。[[go-cpu-investigation|CPU 和内存 profile]] 可以帮助找到分配入口，但单个 GC 函数占比不能直接解释某个请求的全部延迟。

若证据指向分配压力，先减少高频临时对象或无意义复制；若大量对象长期存活，则检查缓存、引用链和生命周期。提高 GOGC 通常以更多内存换较少回收频次；GOMEMLIMIT 是软内存限制，设置过紧可能让 GC 反复工作，不能替代容器内存预算。

工具与权衡见 [Go GC Guide：延迟](https://go.dev/doc/gc-guide#Latency) 和 [Diagnostics](https://go.dev/doc/diagnostics)。这里描述可能的机制，不把 mark assist 预先认定为所有 P99 问题的主因。
