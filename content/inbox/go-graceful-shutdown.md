---
title: "Go 服务怎样在有期限的等待后退出？"
category: "Go"
created_at: "2026-01-25"
updated_at: "2026-10-07"
tags: ["Go", "停机", "Context"]
type: "practice"
---

优雅退出先停止接收新工作，再让在途工作在期限内结束，最后关闭依赖并退出。收到信号或等待固定几秒，都不能证明清理已经完成。

可以用 `signal.NotifyContext` 接收 SIGINT、SIGTERM。收到首次信号后开始停机，并适时调用返回的 `stop` 取消信号订阅；在没有其他订阅等干预时，后续信号可恢复默认退出行为。SIGKILL 无法被捕获。[os/signal](https://pkg.go.dev/os/signal#NotifyContext)

清理要使用独立、尚未取消的 context。例如从 `context.Background()` 建立带超时的 shutdown context；如果直接继承已因信号取消的 context，清理可能一开始就超时退出。

顺序通常是：将实例置为不再接流量，停止监听或消费新任务，通知后台 worker 结束，并通过完成信号或 [[go-waitgroup|WaitGroup]] 等待它们，最后关闭数据库、消息客户端与日志出口。依赖必须活到仍使用它们的工作结束。WaitGroup 本身不提供超时，协调层要同时等待完成与截止时间。

`http.Server.Shutdown` 会关闭监听器、处理空闲连接并等待活跃请求结束，但不负责等待 hijacked 连接，如 WebSocket；这些连接和其他后台任务需要独立管理。主 goroutine 也必须等到 shutdown 协调完成才能退出。[net/http](https://pkg.go.dev/net/http#Server.Shutdown)

到达期限时要明确记录未完成任务，按业务约定中断或留待重试，不能输出「全部安全关闭」。部署平台的终止宽限期还要覆盖摘流量传播、请求收尾和依赖关闭，预算思路与 [[rpc-timeout-budget|请求截止时间]] 相同。
