---
title: "A2A：发现、任务生命周期与协议边界"
parent: a2a
category: "Agent"
tags: ["Agent", "A2A", "协议"]
created_at: "2026-10-13T17:41:05+08:00"
updated_at: "2026-10-13T17:41:05+08:00"
source: ["https://a2a-protocol.org/v1.0.0/specification/", "https://a2a-protocol.org/latest/topics/key-concepts/", "https://a2a-protocol.org/latest/topics/life-of-a-task/", "https://a2a-protocol.org/latest/topics/a2a-and-mcp/"]
read: false
---

**「A2A 统一独立 Agent 服务的外部交互，不要求公开内部模型、记忆或工具。」** 按 2026-10-13 查阅的 1.0.0 规范及官方概念页整理，范围限于协作机制，未执行互操作测试。

## 对方是什么，返回的又是什么？

[Core Concepts](https://a2a-protocol.org/latest/topics/key-concepts/)区分发起请求的 Client 与承担任务的 Server。Server 可以封装一个完整 Agent 系统，Client 不必也是 LLM。

Agent Card 描述身份、能力、技能、接入方式及认证要求；Message 承载一轮通信；Part 表示文本、文件或结构化内容；Artifact 表示可交付成果。Task 为需要持续跟踪的工作提供标识与状态。即时请求可以直接返回 Message，并非所有交流都要创建 Task。

Card 中的技能描述帮助选择对象，不能证明服务可信、调用者有权限或结果正确。

## 为什么还需要 contextId？

[Life of a Task](https://a2a-protocol.org/latest/topics/life-of-a-task/)用 `contextId` 关联同一会话中的任务和消息，用 `taskId` 指向具体工作。任务可能等待补充输入或认证，随后继续；已完成、失败、取消或拒绝的任务属于终态，后续修订应建立新任务，可延续原 context 并引用旧任务。

因此，一个会话可以包含多个任务。标识关联不等于公开服务内部全部历史，也不保证历史永久保存。

## 怎样接收进度与处理异常？

[规范](https://a2a-protocol.org/v1.0.0/specification/)定义公共数据模型与操作，再映射到 JSON-RPC、gRPC、HTTP+JSON/REST 等绑定。轮询查询状态最直接；流式连接接收连续更新；推送通知适合客户端不保持连接的长任务，但需要可达回调与认证。可选能力须按 Agent Card 判断。

发送消息的幂等性是可选行为，`messageId` 可用于去重，但不构成必然保证。取消是请求，可能因任务阶段而失败。认证通过标准安全机制完成，任务访问仍需服务端授权检查。

> **版本注意**：核对时概念页仍有「全部请求响应使用 JSON-RPC」的概括，与 1.0.0 规范的多绑定结构不一致；接入应以选定规范版本为准，不混用旧报文和新 SDK。

## 与 MCP 如何组合？

[A2A and MCP](https://a2a-protocol.org/latest/topics/a2a-and-mcp/)将两者分别定位为独立 Agent 间协作与工具／资源接入。远端 Agent 可以通过 A2A 接任务，再通过 MCP 使用自己的工具。

这一划分是接口职责，不是网络位置，也不能推出 MCP 服务内部不能运行 Agent。A2A 给出任务交换语义，应用仍负责选择合作对象、业务效果验证和副作用控制。
