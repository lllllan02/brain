---
parent: agent-context
title: "上下文压缩（Context Compaction）"
aliases: ["Context Compaction", "上下文摘要", "增量压缩", "全量压缩", "分层摘要"]
category: "Agent"
tags: ["上下文管理", "文本压缩"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**上下文压缩（Context Compaction）是用更短的表示替代较长上下文、延续任务关键信息的机制。** 这里讨论通过模型生成摘要的方式：它会提炼和改写内容，[[context-trimming|裁剪与筛选]]则主要决定原文是否保留。

## 摘要怎样生成？

把待压缩历史与当前目标、要求交给模型，提取「目标、约束、关键事实、已完成事项、待办和未解决问题」，合并重复内容，更新已被后续要求替代的信息，再保存摘要。可以按这些字段组织，而不必只生成一段散文。

优先压缩已完成的过程、重复消息与冗长结果；尚未完成的工具交互留在近期消息中。保存前检查关键约束和证据是否仍在，继续执行所需的精确细节保留原文或可重读入口。摘要可能遗漏信息。[压缩的保留取舍](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

## 每次从哪些材料重新生成？

- 增量压缩（Incremental Compaction）：旧摘要 + 新增历史 → 新摘要。复用上次结果、少读旧历史，但旧摘要遗漏的细节无法仅靠再次摘要恢复。[运行摘要示例](https://langchain-ai.github.io/langmem/reference/short_term/)
- 全量重新摘要：从目标范围内的全部原始历史重新生成。可以重新检查旧摘要遗漏的内容，代价是重复读取与处理；仍不保证摘要无损。

## 原始历史超过窗口怎么办？

全量重新摘要也可以分批组织：

- 逐批递推：第一批 → 摘要；摘要 + 下一批 → 新摘要，直到处理完全部批次。
- 分层汇总（Map-Reduce）：各批独立摘要 → 合并摘要；合并结果仍过长时继续分层。[分批摘要再汇总的实践](https://www.langchain.com/blog/llms-to-improve-documentation)

「是否复用上次运行的摘要」与「本次各批串行递推还是分层汇总」是两个维度。分层也会丢失细节；保留原文和批次摘要，才能按需回查。增量方式的新增消息同样可能过长，所有压缩调用都要满足[[context-budget|容量预算]]。

摘要生成后，要通过[[context-compaction-storage|覆盖范围]]确定下次读取哪些原始消息，不能只保存摘要文本。
