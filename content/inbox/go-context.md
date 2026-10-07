---
title: "Go context 怎样传递取消，为什么 cancel 不等于任务结束？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "context", "取消"]
aliases: ["context.Context"]
---

context 沿调用链传递截止时间、取消信号和请求范围的数据。取消是协作式通知：下游要主动检查 Done，或把 context 交给支持取消的 API；它不会强制杀死 goroutine，也不会等待任务退出。

子 context 的截止时间不会超过父 context。WithCancel、WithTimeout 等返回的 cancel 应及时调用，以释放计时器和父子引用；通常在创建后 defer cancel。Background、TODO 的 Done 可以为 nil，读取 nil channel 会一直等待。

[[rpc-timeout-budget|RPC 预算]] 需要同时覆盖业务处理、重试和返回。将 context 作为函数参数传递，不意味着它会自动穿过网络，框架仍需编码 deadline 和追踪信息，远端也必须协作处理。

Value 适合请求 ID 等跨边界元数据，不适合隐藏必需参数或把所有配置放进一个袋子。key 必须可比较，通常用包内自定义类型避免冲突；context 的并发安全也不自动保护 Value 中保存的可变对象。

要确认资源已经释放，应结合 [[go-waitgroup|WaitGroup]] 或其他完成信号。服务关闭时通常先取消工作，再等待退出，见 [[go-graceful-shutdown|优雅关闭]]。

依据：[context 包文档](https://pkg.go.dev/context)。
