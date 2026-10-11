---
title: "LangChain：消息裁剪与状态删除"
aliases: ["LangChain Short-term memory"]
parent: context-trimming
category: "Agent"
tags: ["Agent", "上下文管理"]
created_at: "2026-10-11T16:21:13+08:00"
updated_at: "2026-10-11T16:21:13+08:00"
source: "https://docs.langchain.com/oss/python/langchain/short-term-memory"
---

**LangChain 用消息裁剪控制历史长度，同时要求处理后的消息序列仍符合模型接口规则。** 本文节选官方 Short-term memory 的裁剪、删除与摘要衔接部分，依据 2026-10-11 页面；不覆盖整篇状态读写教程。

## 怎样裁剪？

线程历史保存在 Agent 状态中。模型调用前，可以按 Token 上限选择近期消息；原文的 `before_model` 示例则保留第一条和最近几条消息，再用 `RemoveMessage` 与 `REMOVE_ALL_MESSAGES` 替换当前消息状态。

这里要区分「只筛选本轮输入」和「修改保存的状态」：原文示例做了后者，不能把所有裁剪代码都理解为临时过滤。仅按条数取最近消息，也不能保证 Token 容量或工具交互完整。

## 删除后还必须满足什么？

`RemoveMessage` 按消息 ID 删除，需要状态字段使用 `add_messages` reducer。删除后仍要满足供应商的消息格式要求，例如某些接口要求从用户消息开始，工具调用后必须有对应结果。

原文用一个连续对话展示信息损失：用户先告诉模型姓名，早期消息删除后，再问姓名就无法回答。由此引出摘要：保留近期消息，把较早信息浓缩保存，而不是直接丢弃。

重点阅读：[Trim messages](https://docs.langchain.com/oss/python/langchain/short-term-memory#trim-messages)、[Delete messages](https://docs.langchain.com/oss/python/langchain/short-term-memory#delete-messages)、[Summarize messages](https://docs.langchain.com/oss/python/langchain/short-term-memory#summarize-messages)。本文未运行示例。
