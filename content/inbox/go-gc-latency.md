---
title: "Go GC 延迟"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "GC", "延迟", "Mark Assist"]
---

**STW 短只说明全局暂停短，不代表 GC 对请求没有影响。** 并发标记会消耗 CPU，分配中的 mark assist 还可能让业务 goroutine 自己承担扫描或等待。

## 分配为什么会带来辅助工作

如果业务分配内存的速度超过后台标记推进的速度，运行时就会按分配量记一笔辅助债务。分配的 goroutine 可能被迫帮忙标记，或等待后台标记有进展，才能继续运行。这样能约束分配与回收的节奏，但不能保证程序永远不 OOM。

所以即使 STW 同样很短，一个分配密集的请求仍可能在本次请求内多次承担 GC 工作；后台扫描也会和业务抢 CPU，清扫和内存管理同样不是零成本。

## 怎样区分相关与因果

把请求变慢的时间段和 GC 周期、分配速率、存活堆、CPU 配额放在一起看，再用 execution trace 观察暂停、调度与辅助工作。[[go-cpu-investigation|CPU 与内存 profile]] 能帮助定位分配入口，但单个 GC 函数占比解释不了某个请求的全部延迟。

如果证据指向分配压力，先减少高频临时对象和无意义复制；如果有大量对象长期存活，就检查缓存、引用链和生命周期。提高 GOGC 通常是用更多内存换更少回收频次；GOMEMLIMIT 是软内存限制，设得过紧会让 GC 反复工作，不能替代容器内存预算。

工具与权衡见 [Go GC Guide：延迟](https://go.dev/doc/gc-guide#Latency) 和 [Diagnostics](https://go.dev/doc/diagnostics)。这里只描述可能的机制，不预设 mark assist 是所有 P99 问题的主因。
