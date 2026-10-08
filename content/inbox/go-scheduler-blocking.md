---
title: "Go 调度器如何处理阻塞与抢占"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["Go", "调度", "阻塞", "抢占"]
aliases: ["GMP 阻塞", "Goroutine 抢占"]
---

**等待和阻塞分两种：等待可轮询的事件时挂起 G，真正阻塞 M 时则把 P 交给别的线程。**

- 等待 channel、锁或可轮询的网络事件时，运行时挂起 G，让 M 去跑别的任务——这也是 [[go-channel-lifecycle|channel]] 能承载大量等待者的原因。
- 系统调用或 cgo 可能真正阻塞 M。此时 P 会按具体路径交接或回收给其他 M，并不是所有调用都立刻新建线程；短系统调用返回后也可能重新拿到执行资源。

Go 支持异步抢占，能降低某些长循环长期霸占执行资源的风险，但仍有安全点和不可抢占区域；时间阈值不是调度延迟 SLA。[[go-gc-cycle|GC 阶段切换]] 也需要运行时协调。

它和传统协程模型的区别，要结合调度层次与并行能力理解。源码入口：[runtime/netpoll.go](https://go.dev/src/runtime/netpoll.go)。
