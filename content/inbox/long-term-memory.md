---
title: "长期记忆（Long-term Memory）"
aliases: ["Long-term Memory", "长期记忆管理"]
category: "Agent"
tags: ["Agent", "记忆"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**长期记忆（Long-term Memory）是独立于单个会话保存和管理、供 Agent 跨会话复用的信息，包括用户偏好、事实、目标与经验。** 它让新会话能沿用过去的信息，减少重复询问和重复探索。

与[[agent-memory|短期记忆]]相比，长期记忆的生命周期不依附于当前会话；它仍可以更新、过期或删除。[长期记忆的定义](https://docs.langchain.com/oss/python/concepts/memory#long-term-memory)

管理流程围绕四个环节组织：

- [[agent-memory-extraction|提取]]：决定何时检查交互、哪些信息值得保留，以及怎样形成候选。
- [[agent-memory-storage|存储]]：选择保存方式，组织内容、来源和适用范围。
- [[agent-memory-retrieval|检索]]：在任务需要时选择相关信息，交给模型使用。
- [[agent-memory-update|更新]]：根据新证据处理重复、变化和冲突。

不同用途可通过[[agent-memory-types|内容分类]]选择策略；跨会话复用还需守住[[agent-memory-security|安全边界]]。是否有效由[[agent-memory-evaluation|质量评估]]验证，过期和积累问题由[[agent-memory-lifecycle|有效期与遗忘机制]]处理。
