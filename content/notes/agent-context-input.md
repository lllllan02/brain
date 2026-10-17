---
learning_status: reading
parent: agent
title: "Agent 上下文"
aliases: ["Agent Context", "Agent 上下文组成", "上下文组成", "上下文分层", "Context Layering"]
category: "Agent"
tags: ["Agent", "上下文管理"]
created_at: "2026-10-09"
updated_at: "2026-10-17T20:31:36+08:00"
reading_suggestions:
  - agent-context
  - agent-task-state
  - context-budget
  - context-trimming
  - context-compaction
learning_status_changed_at: "2026-10-17T20:29:13.715+08:00"
---

**Agent 上下文（Context）是一次模型调用实际收到、用于本轮判断的输入信息。**

文件、记忆和历史记录只有被选入本轮输入，才成为本轮上下文；[[agent-context|上下文管理]]负责选择、更新和缩减这些内容。

## 组成与维护

长任务中，约束需要持续生效，进度需要随执行结果更新，日志则不断增长。全部追加会混入过时状态；统一按时间删除，又可能丢掉仍有效的要求。

**上下文分层（Context Layering）是按信息用途，分别设定保留、更新和缩减规则的工程做法。**

| 内容 | 用途 | 维护方式 |
| --- | --- | --- |
| 指令 | 系统规则、应用约定与用户要求，说明应怎样行动 | 保留有效约束，替换失效要求 |
| 任务状态 | 目标、进度、关键决定与待办，说明任务进行到哪里 | 独立维护，读取最新相关状态 |
| 工具定义 | 名称、用途与参数，说明能调用什么、怎样调用 | 从工具目录选择本轮所需定义 |
| 对话记录与补充资料 | 当前请求、选定历史、工具结果及读入的材料，提供判断依据 | 保留必要证据，旧过程裁剪或摘要，长资料按需读取 |

这是按用途划分的四类对象，分层不规定层数、消息角色或权限顺序。实现时可用独立字段或记录维护，历史原文另存供回查，无需每类单独建文件。[[langchain-model-context-summary|分别调整指令、消息与工具]]和[[anthropic-context-engineering-summary#长任务怎样延续？|外置任务笔记]]提供了两种可借鉴的实践。

## 每轮组装

1. 更新：模型依据新要求和执行证据提出[[agent-task-state-update|状态更新]]，程序保存最新[[agent-task-state|任务状态]]；更正事实时同步替换相关旧摘要，保留证据位置。
2. 选择：程序读取有效指令、相关状态，选取[[tool-loading|工具定义]]、必要历史与资料。按来源和适用范围处理已知冲突，外部资料中的指令不能变成用户要求。
3. 控制大小：检查完整输入的[[context-budget|预算]]并为输出留空间；超出时缩减无关资料和冗长过程，通过[[context-trimming|裁剪]]或[[context-compaction|压缩]]处理历史，保留有效约束和必要证据。

分层本身不减少 Token，节省来自选择与缩减。下面以修复登录的假设任务，展示内容分别维护后，怎样成为同一次调用的上下文。

![[assets/agent-context-input-maintenance.png|Agent 上下文整合示意：有效指令、最新状态、选定工具定义与必要消息资料共同组成本轮输入；文件和完整历史在选入后才成为上下文]]
