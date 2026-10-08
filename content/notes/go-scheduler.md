---
title: "Go 调度器（GMP）"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "调度", "GMP"]
aliases: ["GMP", "Goroutine 调度", "GMP 模型"]
---

**Go 的调度器用 G、M、P 三个角色，把大量 goroutine 安排到少量线程上运行。** G 是 goroutine，M 是操作系统线程，P 是执行 Go 代码所需的调度资源。

- **G**：一个 goroutine，包含它的栈和调度状态。
- **M**：一个操作系统线程，真正执行代码的载体。
- **P**：一块调度资源，持有本地可运行队列。**M 通常要持有 P 才能跑普通 Go 代码**，`GOMAXPROCS` 约束的就是能同时跑这类代码的 P 数量，不是进程的线程数上限。

可运行的 G 分布在 P 的本地队列、全局队列等位置：调度器优先用本地队列，本地空了就从其他 P 窃取或查全局队列，避免忙闲不均。这种「先用局部工作、再窃取平衡」的思路减少了共享竞争，也带来窃取和公平检查的成本。

「goroutine 很轻」不等于没有上限：每个 G 都有栈、调度状态和可能保留的业务对象，无限创建仍会吃内存和下游连接，应结合 [[backpressure|背压]] 控制在途任务。

阻塞、抢占与 GC 对调度的影响见 [[go-scheduler-blocking|调度器如何处理阻塞与抢占]]。源码入口：[runtime/proc.go](https://go.dev/src/runtime/proc.go)。
