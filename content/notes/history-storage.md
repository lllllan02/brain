---
learning_status: organized
parent: agent-context
title: "对话历史的存储"
category: "Agent"
tags: ["Agent", "上下文管理", "持久化"]
created_at: "2026-10-09"
updated_at: "2026-10-17T20:41:58+08:00"
reading_suggestions:
  - pi-session-storage-summary
  - openai-conversation-storage-summary
  - context-compaction
  - agent-checkpoint-recovery
learning_status_changed_at: "2026-10-17T20:48:28.333+08:00"
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

按会话 ID 找到历史，按顺序读回，再由[[agent-context|上下文管理]]选择本轮需要的消息并组装模型输入。

![[assets/history-storage-flow.png|新结果追加到会话文件，再读回并选择本轮所需的历史；未选入的记录仍保留]]

分页读取要继续取后续页；支持分支的会话应只沿当前分支读取。未选入的原文仍可[[context-loading|按需回查]]，读回工具结果也不会重新执行工具。恢复到具体执行步骤，还需要[[agent-checkpoint-recovery|检查点与中断恢复]]。

## 压缩摘要

采用[[context-compaction|上下文压缩]]时，原始历史继续保留，另存「摘要正文、所属会话与覆盖边界」。摘要可放在独立文件、同一 JSONL 的压缩记录或数据库中；[[pi-compaction-summary|Pi]]在会话文件中追加摘要与原文保留起点。

边界由程序用消息 ID 记录。例如摘要已覆盖 m1～m4，读取时就用「摘要 + m5 起的原始消息」组装输入，工具调用与结果仍须配对。再次压缩时同步更新摘要与边界，生成或写入失败则沿用旧记录。

后台压缩提交时要校验所依据的历史与摘要版本，避免旧结果覆盖新摘要；边界后的消息从当前历史读取，保留压缩期间到达的新要求。
