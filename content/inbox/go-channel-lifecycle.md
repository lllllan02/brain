---
title: "Go channel 的关闭与生命周期"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "channel", "并发"]
aliases: ["channel 关闭", "nil channel"]
---

**关闭 channel 表示「不会再有数据发来」，应由能确定所有发送者都已结束的一方来关。** 接收者不能因为暂时没数据就关，多个发送者也不能各关一次。

| 状态 | 发送 | 接收 | 关闭 |
| --- | --- | --- | --- |
| nil channel | 永久阻塞 | 永久阻塞 | panic |
| 未关闭 | 按缓冲与接收者情况等待 | 按缓冲与发送者情况等待 | 成功一次 |
| 已关闭 | panic | 先取剩余缓冲，再返回零值与 false | panic |

select 里 nil channel 对应分支永远不就绪，可以借此临时关掉某个方向；没有 default 且所有分支都不可用时仍会阻塞。

多发送者场景可以由协调者用 [[go-waitgroup|WaitGroup]] 等全部发送结束再统一 close。sync.Once 只能防重复 close，解决不了发送与关闭之间的竞争；「先检查是否关闭再发送」也存在检查后状态变化的窗口。

停止任务和结束数据流是两回事：可以用 [[go-context|context]] 通知发送者取消，等它们退出，最后关闭结果流。channel 不必为了 GC 主动关闭；真正泄漏的往往是「没有退出路径的 goroutine 及其保留的引用」。

状态规则见 [Go 规范：channel](https://go.dev/ref/spec#Channel_types)。
