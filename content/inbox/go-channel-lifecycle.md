---
title: "Go channel 应该由谁关闭？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "channel", "并发"]
aliases: ["channel 关闭", "nil channel"]
---

关闭 channel 表示不会再发送数据，通常由能确定所有发送者已经结束的一方负责。接收者不能只因暂时没有数据就关闭，多个发送者也不能各自关闭同一 channel。

| 状态 | 发送 | 接收 | 关闭 |
| --- | --- | --- | --- |
| nil channel | 永久阻塞 | 永久阻塞 | panic |
| 未关闭 | 按缓冲与接收者情况等待 | 按缓冲与发送者情况等待 | 成功一次 |
| 已关闭 | panic | 先取剩余缓冲，再返回零值与 false | panic |

select 中 nil channel 对应分支不会就绪，可以据此临时关闭某个方向；无 default 且所有分支都不可用时仍会阻塞。

多发送者场景可以由协调者通过 [[go-waitgroup|WaitGroup]] 等待全部发送结束，再统一 close。sync.Once 只能防止重复 close，不能解决发送与关闭之间的竞争。先检查“是否关闭”再发送也存在检查后的状态变化窗口。

停止任务与结束数据流是不同协议：可以用 [[go-context|context]] 通知发送者取消，再等待它们退出，最后关闭结果流。channel 不要求为了 GC 而主动关闭；真正导致泄漏的常是没有退出路径的 goroutine 及其保留引用。

状态规则见 [Go 规范：channel](https://go.dev/ref/spec#Channel_types)。
