---
title: "Go 的 G、M、P 怎样把 goroutine 安排到线程？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "调度", "GMP"]
aliases: ["GMP", "Goroutine 调度"]
---

G 表示 goroutine，M 表示操作系统线程，P 保存执行 Go 代码所需的调度资源。M 通常持有 P 才能运行普通 Go 代码；GOMAXPROCS 约束可同时执行这类代码的资源数量，不是进程线程数上限。

可运行的 G 分布在本地队列、全局队列等位置。调度器优先利用局部工作，也会从其他 P 窃取任务、检查全局队列与网络事件，避免局部忙闲不均。局部队列减少共享竞争，窃取和公平检查则有额外成本。

## 阻塞时谁被停下

等待 channel、锁或可轮询网络事件时，运行时可以挂起 G，让 M 执行其他任务。系统调用或 cgo 可能阻塞 M，此时 P 的交接与回收按具体路径处理，并非所有调用都立即创建新线程。短系统调用返回后也可能重新取得执行资源。

因此“goroutine 很轻”不意味着创建没有上限。每个 G 都有栈、调度状态及可能保留的业务对象；无限创建仍会消耗内存和下游连接。应结合 [[backpressure|背压]] 控制在途任务。

Go 支持异步抢占，降低某些长循环长期霸占执行资源的风险，但仍有安全点与不可抢占区域。时间阈值不是调度延迟 SLA。[[go-gc-cycle|GC 阶段切换]] 也需要运行时协调。

goroutine 与传统协程模型的区别，应结合 [[processes-threads-coroutines|调度层次与并行能力]] 理解。源码入口：[runtime/proc.go](https://go.dev/src/runtime/proc.go)、[runtime/netpoll.go](https://go.dev/src/runtime/netpoll.go)。
