---
title: "Agent 记忆（Memory）"
aliases: ["Agent Memory"]
category: "Agent"
tags: ["Agent", "记忆"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**Agent 记忆（Memory）是保存并按需使用过去信息的机制，让 Agent 能延续交互、复用偏好和经验，避免每次都从零开始。**

按作用范围，可以分为两类：

- 短期记忆（Short-term Memory）：服务于当前会话或线程，保留历史消息与任务状态，通过[[agent-context|上下文管理]]为后续交互提供信息；也可以持久化，以便恢复同一会话。
- [[long-term-memory|长期记忆（Long-term Memory）]]：独立于单个会话管理，在授权范围内跨会话复用偏好、事实和经验；可以更新或过期，不意味着永久保存。

两者主要区别在于「会话内延续」与「跨会话复用」，不能只看保存时间或是否写入数据库。[记忆作用范围的定义](https://docs.langchain.com/oss/python/concepts/memory#short-term-memory)

