---
title: "Agent 的历史与状态存储"
category: "Agent"
tags: ["Agent", "状态管理", "持久化"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**Agent 的历史与状态存在哪里，取决于持久化、查询、并发和恢复需求，没有固定的 JSONL 或数据库要求。** 对话历史用于还原交互，[[agent-state|结构化状态]]用于记录目标、进度和运行情况；它们可以共用存储，但管理逻辑不同。

- 内存：实现简单，适合不要求重启恢复的运行；进程退出后数据通常丢失。
- JSONL：按行追加消息或事件，适合本地会话记录、日志与数据导出；并发写入、更新和检索需要另外设计。
- SQLite、MySQL、PostgreSQL 等数据库：按查询与并发需求选择，用于持久保存消息和状态。
- Redis：可用于近期历史、临时状态或缓存；若承担恢复依据，需要明确持久化、过期与丢失容忍要求。

已有 MySQL 的服务可以将消息与任务状态分别建模保存，Redis 按需补充缓存；这是可选方案，不是 Go Agent 的必需组合。会话存储的不同后端可参考 [Agents SDK Sessions](https://openai.github.io/openai-agents-python/sessions/)。

采用历史摘要时，[[context-compaction-storage|摘要的保存与读取]]还需记录覆盖范围，才能组合「有效摘要 + 未压缩消息」；摘要与原始消息可以分开或混合保存，需要追溯时继续保留原始历史。

## 实际 Agent 怎么保存？

以下按 2026-10-09 查阅的官方资料记录，限于注明的运行方式与版本：

| Agent / 运行方式 | 历史与状态保存方案 |
| --- | --- |
| Claude Code，本地 | JSONL 会话记录；文件修改快照另存。[官方说明](https://code.claude.com/docs/en/how-claude-code-works#work-with-sessions) |
| Codex，本地 App Server | JSONL 会话日志 + SQLite 线程元数据。[官方说明](https://learn.chatgpt.com/docs/app-server#threads) |
| OpenCode V2，本地或远程服务器 | 服务器用 SQLite 管理会话。[官方说明](https://opencode.ai/v2/docs/cli) |
| Anthropic Managed Agents，云端 | 独立的追加式持久会话事件日志；底层数据库未公开。[架构说明](https://www.anthropic.com/engineering/managed-agents) |
| Codex Cloud，云端 | 支持任务继续与文件、工具状态恢复；查阅资料未公开历史存储格式。[官方说明](https://learn.chatgpt.com/docs/environments/cloud-environments) |

JSONL 可以承担正式会话记录；历史、元数据与文件状态也可使用不同存储。[[agent-checkpoint-recovery|Checkpoint 与中断恢复]]是在存储之上组织状态保存与任务接续的机制，不能只靠选数据库实现。
