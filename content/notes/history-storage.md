---
learning_status: organized
parent: agent-context
title: "对话历史的存储"
category: "Agent"
tags: ["Agent", "上下文管理", "持久化"]
created_at: "2026-10-09"
updated_at: "2026-10-17T20:24:51+08:00"
reading_suggestions:
  - pi-session-storage-summary
  - openai-conversation-storage-summary
  - context-compaction-storage
  - agent-checkpoint-recovery
learning_status_changed_at: "2026-10-17T20:32:30.350+08:00"
---

**对话历史存储是按会话持久保存用户消息、模型回复、工具调用与结果的机制。** 它让应用在进程结束后仍能接续对话、回查原文。

## 记录与写入

按交互顺序保存结构化记录，保留会话 ID、消息 ID、角色与内容。工具调用还要保存名称、参数和调用 ID，结果通过同一调用 ID 关联；只存聊天文字或调用 ID，无法还原完整交互。

例如将一个会话写入 `session_01.jsonl`：每行一个 JSON 对象，新消息和工具结果逐条追加。[[pi-session-storage-summary|Pi 的会话文件]]采用这种格式，具体字段由实现决定。附件或大结果可另存，但引用必须能找到原内容。

## 存放位置

| 位置 | 保存与访问方式 |
| --- | --- |
| 本地文件 | 写入应用管理的会话目录，按文件定位并读取 |
| 数据库 | 按会话 ID 与消息顺序存取，便于查询和事务管理 |
| 托管会话 | 由服务端保存，应用保留会话 ID，通过接口追加和读取 |

JSON／JSONL 是数据格式，文件或数据库是存放位置；[[openai-conversation-storage-summary|托管会话的读取与保留规则]]则由服务约定。

写入重试应按稳定记录 ID 去重；前端已经显示的流式内容，仍可能尚未持久保存。

## 读回与使用

按会话 ID 找到历史，按顺序读回，再由[[agent-context|上下文管理]]选择本轮需要的消息并组装模型输入。采用[[context-compaction-storage|压缩摘要]]时，按覆盖边界接上后续原文，避免重复或遗漏。

![[assets/history-storage-flow.png|新结果追加到会话文件，再读回并选择本轮所需的历史；未选入的记录仍保留]]

分页读取要继续取后续页；支持分支的会话应只沿当前分支读取。未选入的原文仍可[[context-loading|按需回查]]，读回工具结果也不会重新执行工具。恢复到具体执行步骤，还需要[[agent-checkpoint-recovery|检查点与中断恢复]]。
