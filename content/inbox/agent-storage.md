---
parent: agent
title: "Agent 的历史与状态存储"
category: "Agent"
tags: ["Agent", "状态管理", "持久化"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**Agent 的历史与状态存储要分别选择保存内容、表示格式和存储位置，依据读写者、持久化、查询与并发需求决定。** 对话历史保留消息、工具调用和结果，[[agent-task-state|任务状态]]保存当前有效的目标、计划、进度、关键结果与待处理事项；两者可以共用存储。

## 用什么格式表示？

| 格式 | 适合什么用途 | 需要考虑什么 |
| --- | --- | --- |
| Markdown | 人与模型阅读、编辑任务计划和说明 | 程序读取进度需要额外约定和解析 |
| JSON 等结构化格式 | 程序按字段读取、校验或控制执行 | 明确字段、类型和允许值；JSON 本身不保证数据正确 |
| JSONL | 按行追加消息或事件，保存历史、日志或导出数据 | 更新当前状态、并发写入和检索需要另行设计 |

「给人看」不强制使用 Markdown，「给程序看」也不只限于 JSON。两者都需要时，可以从同一份结构化记录生成阅读界面，避免维护两份不一致的正文。上述是设计取舍，不是固定产品要求。

## 保存在哪里？

| 位置 | 适用条件与代价 |
| --- | --- |
| 进程内存 | 实现简单，只需在当前运行期间保留；进程退出后通常丢失 |
| 本地文件 | 保存 Markdown、JSON 或 JSONL，适合本地持久化；频繁查询和并发更新需额外处理 |
| SQLite、MySQL、PostgreSQL 等数据库 | 持久保存历史与状态，按查询、事务、并发和部署条件选择 |
| Redis | 保存近期历史、临时状态或缓存；承担持久记录时需明确持久化、过期与丢失容忍要求 |

**「格式与位置是两项选择」**：JSON 可以存于内存、文件或数据库，Markdown 也可以保存到文件或数据库。不展示给人看，仍需考虑程序如何读写与校验。

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
