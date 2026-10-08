---
title: "Go context"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "context", "取消"]
aliases: ["context.Context"]
---

**context 沿调用链传递截止时间、取消信号和请求范围的数据，取消是协作式的通知。** 它不会强杀 goroutine，也不等待任务退出——要真正结束，下游必须自己检查 Done，或把 context 交给支持取消的 API。

子 context 的截止时间不会超过父 context。WithCancel、WithTimeout 等返回的 cancel 要及时调用，以释放计时器和父子引用，通常在创建后 defer cancel。Background、TODO 的 Done 可能为 nil，读 nil channel 会一直等待。

RPC 预算要同时覆盖业务处理、重试和返回。把 context 当函数参数传，不代表它会自动穿过网络：框架仍要编码 deadline 和追踪信息，远端也必须协作处理。

Value 适合请求 ID 这类跨边界元数据，不适合藏必需参数、或把所有配置塞进一个袋子。key 必须可比较，通常用包内自定义类型避免冲突；context 的并发安全也不会自动保护 Value 里保存的可变对象。

要确认资源真的释放了，应结合 [[go-waitgroup|WaitGroup]] 或其他完成信号。服务关闭时通常先取消工作、再等退出，见 [[go-graceful-shutdown|优雅关闭]]。

依据：[context 包文档](https://pkg.go.dev/context)。
