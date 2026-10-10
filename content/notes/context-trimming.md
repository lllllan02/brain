---
parent: agent-context
title: "上下文裁剪与筛选"
aliases: ["Context Truncation", "Context Trimming", "Context Filtering", "上下文裁剪", "上下文筛选"]
category: "Agent"
tags: ["上下文管理"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**裁剪与筛选都是决定哪些信息进入模型上下文的选择操作，通常保留选中内容的原文。** 被排除的信息不进入本轮输入；它仍可以保存在历史记录中。

为便于比较，可以按侧重点区分：

| 方式 | 选择依据 | 示例 |
| --- | --- | --- |
| 裁剪（Truncation / Trimming） | 时间、数量等固定规则 | 滑动窗口只保留最近几轮完整交互 |
| 筛选（Filtering） | 当前任务的相关性或重要性 | 制定学习计划时保留学习目标和做题记录，排除无关闲聊 |

这是工程讨论中的一种划分；广义的裁剪也可能包含重要性筛选，术语边界并不统一。两者都可以由程序完成，筛选也可结合关键词、向量检索或模型判断，不能用「程序执行还是模型执行」区分。

程序可用角色、来源、时间等元数据近似判断价值，不必每条消息都调用模型评分。若把多条记录重新总结成一段结论，就属于[[context-compaction|摘要压缩]]。达到多少 Token 才处理，则由[[context-budget|预算]]决定，与删哪些内容是两个问题。

保留当前任务目标与关键约束，按完整交互处理历史，尤其要维持工具请求与结果的配对，避免只留下依赖已删结果的消息。[消息裁剪与有效性要求](https://docs.langchain.com/oss/python/langchain/short-term-memory#delete-messages)
