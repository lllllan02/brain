---
title: "Letta：常驻记忆块与归档检索"
parent: agent-memory-retrieval
category: "Agent"
tags: ["Agent", "记忆"]
created_at: "2026-10-12T23:24:47+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://docs.letta.com/v1-sdk/memory/memory-blocks"
  - "https://docs.letta.com/v1-sdk/memory/archival-memory"
  - "https://docs.letta.com/v1-sdk/concepts/stateful-agents"
---

**「Letta 将少量持续可见的信息放进 memory blocks，将较多资料放进需要检索的 archival memory。」** 本文依据 2026-10-12 官方 V1 SDK 文档，说明其状态型 Agent 的记忆组织；未部署验证。

## 为什么分成两层？

[Memory blocks](https://docs.letta.com/v1-sdk/memory/memory-blocks) 是加入模型上下文的结构化文本块。每块有 label、description、value 和字符容量 limit；description 告诉模型该块保存什么，value 承载实际内容。它可以保存用户信息、行为规则或工作状态，模型通过工具修改。

**「常驻块免去一次检索，却持续占用上下文」**。因此“大量历史”和“每轮都要知道的少量信息”需要不同位置。块还能被多个 Agent 共享，或设成 `read_only`；共享只是共享状态，不能由此推断所有业务冲突都已解决。

## 归档如何进入本轮输入？

[Archival memory](https://docs.letta.com/v1-sdk/memory/archival-memory) 保存需要长期保留、按需查找的内容。Agent 使用 `archival_memory_insert` 与 `archival_memory_search`，通过语义和标签选择相关记录；开发者可通过 passages API 管理内容。

原文特意区分归档与 conversation search：前者是**「主动整理保存的事实、资料」**，后者回查实际说过的消息。它们可以相互核对，不能把摘要视为原始证据。文档列出的 Agent 归档工具以插入、查询为主，修改与删除还要看 SDK 和应用提供的能力。

例如，某项长期偏好可留在常驻块，形成该偏好的多次交流保留在历史里，需要时再回查。这个例子是对两层设计的应用推演，不是 Letta 保证采用的固定迁移算法。

**适用判断：需要持续状态及 Agent 自主管理记忆时，Letta 提供一体化运行模型；已有完整运行循环、只缺一个存储组件时，需要先评估接入这一运行模型的改动。** 常驻容量、检索命中与模型更新正确性仍要单独验证。
