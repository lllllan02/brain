---
title: "Agent 上下文管理"
aliases: ["Context Management", "Agent Context"]
category: "Agent"
tags: ["Agent", "上下文管理"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**Agent 上下文管理（Context Management）是为每次模型调用组织、选择和压缩输入的机制。** 它从指令、历史、工具信息与[[agent-task-state|任务状态]]中选择模型本轮需要的内容。

## 为什么需要管理上下文？

[[agent-loop|Agent Loop]] 不断累积消息与工具结果，可能超出窗口、增加成本与延迟，无关信息也会干扰判断。因此，需要在有限预算内保留任务所需的信息。[长上下文的限制](https://docs.langchain.com/oss/python/langchain/short-term-memory)

## 如何逐步完善？

设计可以从「直接拼接历史消息」开始，根据暴露的问题增加机制：

- 历史太长：先用[[context-trimming|裁剪]]保留近期完整交互。
- 裁剪丢了旧约束或进度：引入[[context-compaction|压缩]]，用摘要延续关键信息。
- 摘要、历史与工具结果仍可能超限：通过[[context-budget|预算]]统筹容量，为输出留空间。
- 不同信息不能采用同一种保留策略：引入[[context-layering|分层]]，分别管理指令、任务状态、历史和工具结果。
- 无关信息过多或单次结果太大：结合相关性筛选与[[context-loading|按需加载]]，只取当前需要的部分。

这是一条按问题推演的设计路径，顺序可以调整，例如先实现预算，再引入压缩；这些机制也可以组合使用。

## 每次调用时怎样配合？

从职责看，可以理解为「信息组织与存储 → 容量预算 → 内容选择 → 必要的压缩 → 组装与检查」。这是运行时的逻辑关系，与逐步增加功能的设计过程不同，也不要求每轮都执行所有步骤。

一种输入组合是「当前有效指令与[[agent-task-state-input|最新任务状态]] + 历史摘要 + 尚未压缩的交互 + 必要的外部信息」，当前用户输入只加入一次。**每轮调用前检查容量、工具请求与结果的配对关系，以及关键约束是否保留。** 压缩可以按预算触发，也可在阶段结束后提前完成。[上下文管理实践](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

[[long-term-memory|长期记忆]]将跨会话信息按需带入模型输入，召回内容仍需参与筛选、去重与预算管理。

完整历史的[[agent-storage|存储]]与模型输入分别管理；压缩或裁剪本轮输入不要求删除原始记录。[会话记录与上下文的区别](https://www.anthropic.com/engineering/managed-agents)
