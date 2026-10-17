---
title: "A2A（Agent 间通信协议）"
aliases: ["Agent2Agent", "Agent-to-Agent", "A to A"]
parent: multi-agent
category: "Agent"
tags: ["Agent", "A2A", "协议"]
learning_status: organized
created_at: "2026-10-13T17:41:05+08:00"
updated_at: "2026-10-18T00:22:52+08:00"
reading_suggestions:
  - multi-agent
  - a2a-protocol-specification
learning_status_changed_at: "2026-10-18T00:23:55.123+08:00"
---

**A2A（Agent2Agent）是独立 Agent 服务之间交换能力、消息、任务状态与成果的开放协议。**

跨团队调用一个 Agent，除了发送需求，还要约定怎样查进度、补输入和取成果。A2A 统一这些交互，减少各服务之间的重复适配；应用内部能统一管理的执行者，直接用函数或 SDK 即可。

## 一次任务怎样运行？

假设主 Agent 委派报告 Agent 分析 CSV。上方是主应用，下方是独立的报告服务；时间从左向右推进：

![[assets/a2a-exchange.png|720]]

客户端（Client）是主应用里发网络请求的程序；服务端（Server）是报告服务里接请求的程序。模型可以提出委派，程序负责实际通信。Message 装需求，Task 记录工作及状态，Artifact 装成果。客户端提交的是任务；是否为任务创建新的 Agent 实例，由服务端决定。

## 实现时要写哪些代码？

- 客户端：读取能力卡，按声明的地址、协议版本和认证要求连接；发送需求，保存本地请求与远端任务编号的对应关系，根据状态继续或结束。
- 服务端：用 A2A SDK 接收请求、维护任务，通过[[a2a-protocol-specification#请求如何接到 Agent 代码|执行器]]调用已有 Agent，把进度和成果交回协议层。
- Agent 本身：仍需实现读取数据、调用模型与工具、生成报告的业务逻辑。它可通过 [[mcp|MCP]]取数；A2A 负责外部通信，不会自动生成这段业务代码。

它与[[multi-agent#协作组织|子 Agent]]可以组合：子 Agent 表示委派关系，A2A 承担跨服务通信。

## 具体报文

[[assets/a2a-exchange.txt|完整 HTTP 请求与响应]]包含发现、提交、查询、补输入和取消，按 [[a2a-protocol-specification#HTTP 调用与返回|1.0.0 的 HTTP+JSON 绑定]]编写。域名与数据为教学假设，未做服务联调。

图中采用 `returnImmediately: true`：先返回任务编号，再查询进度；省略时默认等待任务完成或暂停。服务支持时，也可用流式更新或推送取得进度。简单请求可直接返回 Message，无需创建 Task。

## 什么时候继续，什么时候停止？

缺输入时，问题放在**「任务状态里的消息」**中返回。沿用图中的轮询方式：

1. 服务端执行器根据输入检查或 Agent 的处理结果发现缺少月份，把 `t1` 设为 `TASK_STATE_INPUT_REQUIRED`，在 `status.message` 中写「统计哪个月？」。
2. 客户端下一次 `GET /tasks/t1` 读到状态和问题，停止单纯等结果，转而询问用户或由主 Agent 补齐条件。
3. 客户端再次 `POST /message:send`，带 `taskId: "t1"` 和答案。服务端找到原任务，结合保存的输入与进度重新调度执行。

「暂停」指任务等待输入；实现可以结束本轮执行并保存继续所需的信息，不要求一直挂着线程。[[a2a-protocol-specification#询问如何传回客户端|问题的传递]]取决于接入方式：阻塞调用可直接在原请求响应中返回，SSE 可沿已建立的流发送更新；只有选择推送时，才由服务端 POST 到客户端配置的 Webhook。轮询方式无需客户端提供回调接口。

- 任务终结：完成、失败、取消、拒绝后停止跟踪。已完成的报告要重做，需创建新任务；可沿用 `contextId` 关联前后工作。完成状态仍需与报告内容分别验收。
- 网络中断：已知任务编号就先查询；编号未知时先核对去重约定，`messageId` 不保证重发安全。取消也不保证已产生的外部效果回滚。
