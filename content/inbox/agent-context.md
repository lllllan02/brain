---
parent: agent
title: "Agent 上下文管理"
aliases: ["Context Management"]
category: "Agent"
tags: ["Agent", "上下文管理"]
created_at: "2026-10-09"
updated_at: "2026-10-11T16:16:55+08:00"
---

**Agent 上下文管理（Context Management）是在有限窗口内，为每次模型调用选择和组织输入的机制。** [[agent-context-input|上下文]]会随循环增长，接近窗口上限时，就需要开始删减。[窗口与长历史的限制](https://docs.langchain.com/oss/python/langchain/short-term-memory)

最简单的是[[context-trimming|上下文裁剪]]：例如用滑动窗口保留最近几轮完整交互，移除更早的记录。但旧记录也可能包含仍有效的约束和结论，直接删除会让模型失去这些信息。

于是引入[[context-compaction|摘要压缩]]：把旧历史中的关键信息提炼成短摘要，与近期原文一起传入。这样既保留近期细节，也延续较早的任务信息；摘要仍可能遗漏内容，需要检查关键约束与证据。[压缩的保留取舍](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

这两种操作处理的是本轮输入，完整历史仍可另外[[agent-storage|保存]]，不必随裁剪删除。[历史与输入的区别](https://www.anthropic.com/engineering/managed-agents)

## 再按遇到的问题完善

- 何时触发、保留多少：用[[context-budget|预算]]控制 Token 总量并预留输出空间。
- 哪些不能删、哪些需要更新：用[[context-layering|分层]]区分指令、任务状态与普通历史的处理策略。
- 单次资料就太大：用[[context-loading|按需加载]]只取相关片段。
- 工具定义占用太多：用[[tool-loading|工具按需加载]]选择本轮暴露的工具。

## 问题定义与工程取舍

- [[anthropic-context-engineering-summary|Anthropic：为每一步选择有效上下文]]
- [[manus-context-engineering-summary|Manus：上下文怎样影响成本与行动]]
- [[langchain-context-engineering-summary|LangChain：写入、选择、压缩与隔离上下文]]

## 实验与替代方案

- [[complexity-trap-summary|旧工具结果屏蔽能否替代摘要]]
- [[factory-compression-evaluation-summary|压缩后的任务状态怎样评测]]
- [[chroma-context-rot-summary|长上下文失效怎样通过对照实验定位]]
- [[ace-context-engineering-summary|ACE：用增量条目保留可复用经验]]
- [[recursive-language-models-summary|RLM：把长输入放在环境中分解处理]]
