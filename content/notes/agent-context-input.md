---
learning_status: organized
parent: agent
title: "Agent 上下文"
aliases: ["Agent Context", "Agent 上下文组成", "上下文组成"]
category: "Agent"
tags: ["Agent", "上下文管理"]
created_at: "2026-10-09"
updated_at: "2026-10-17T20:37:59+08:00"
reading_suggestions:
  - agent-context
  - agent-task-state
learning_status_changed_at: "2026-10-17T20:40:23.429+08:00"
---

**Agent 上下文（Context）是一次模型调用实际收到、用于本轮判断的输入信息。**

按用途，通常包含四类内容：

- 指令：系统规则、应用约定和用户的有效要求，说明应按什么要求行动。
- [[agent-task-state|当前任务状态]]：目标、进度、关键决定和待办，说明任务进行到哪里。
- 工具定义：本轮可用工具的名称、用途和参数，说明能调用什么、怎样调用。
- 对话记录与补充资料：当前请求、选定的历史消息、工具调用及其结果，以及读入的文件、检索片段和记忆，提供判断所需的信息。

文件、记忆和历史记录只有被选入本轮输入，才成为本轮上下文；具体维护方式由[[agent-context|上下文管理]]说明。

![[assets/agent-context-composition.png|本轮上下文包含指令、当前任务状态、工具定义与选定消息资料；文件、检索资料和记忆经读取后进入本轮输入]]
