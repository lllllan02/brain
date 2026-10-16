---
learning_status: pending
parent: agent-context
title: "Agent 任务状态管理"
aliases: ["Agent Task State", "Task State Management"]
category: "Agent"
tags: ["Agent", "状态管理"]
created_at: "2026-10-09"
updated_at: "2026-10-16T20:42:35+08:00"
reading_suggestions:
  - agent-context
  - agent-task-state-update
  - langchain-todo-state-summary
  - context-loading
---

**任务状态管理（Task State Management）是把当前任务的目标、约束、进度和待办，从历史中提取出来，作为独立记录持续维护。**

历史被[[context-trimming|裁剪]]或[[context-compaction|压缩]]后，任务要求和进度仍需保留。[[anthropic-context-engineering-summary|Anthropic 的外置笔记实践]]便将这些信息单独保存，在后续调用中读回；这是[[agent-context|上下文管理]]中延续任务的一种方式。

## 哪些信息值得单独维护？

| 内容 | 修复登录故障的假设示例 |
| --- | --- |
| 目标与完成条件 | 修复过期令牌故障，相关测试通过 |
| 有效约束 | 只修改 `auth.py`，保持接口兼容 |
| 计划与进度 | 定位、修改已完成；验证未通过 |
| 关键结果与判断 | 测试返回 401；怀疑重试仍使用旧令牌，尚未验证 |
| 下一步与依据 | 检查重试逻辑；完整结果保存在 `test.log` |

记录保持原意，区分假设与验证结果，不遗漏未解决事项和阻塞原因；关键数值、标识与路径保留准确值，长材料保留可访问的引用。

状态随任务推进[[agent-task-state-update|更新并处理冲突]]，不必等窗口快满。记录可用文件或结构化字段：[[manus-context-engineering-summary|Manus 更新待办文件]]，[[langchain-todo-state-summary|LangChain 用待办工具]]承接更新；程序负责保存和必要校验。

## 在完整上下文中放在哪里？

最新状态作为独立部分加入每轮相关调用，与整理后的历史一起提供；详细材料[[context-loading|按需读取]]。

![[assets/agent-task-state.png|完整上下文按区块组装：系统提示词、工具定义、最新任务状态、历史消息与当前请求]]

[Claude Code 的任务列表](https://code.claude.com/docs/en/interactive-mode#task-list)支持跨上下文压缩保留。**「独立维护」不等于「原始消息都可以删除」**：状态记录当前判断，必要的工具结果仍需原文或可读取的引用。

## 任务状态应该是一份摘要，还是业务事实的副本？

退款 Agent 的摘要写着「订单符合条件」，几分钟后订单已经发货；如果执行器仍把摘要当成当前事实，就会依据过期条件操作。状态需要区分用户要求、待办、观测事实和模型判断，并记录事实的对象、来源及查询时间。

用户约束应保留到被明确修改，业务事实则按有效期或关键动作重新查询。任务状态可以保存「上次查询符合条件」及证据位置，但当前是否允许退款，应由业务系统在执行时判断。这样既保留调查过程，也避免维护一个永远追不上真实系统的影子数据库。

状态还应表达未完成和未知：请求已受理、正在处理、确认成功各自决定不同的下一步。只有一个 `done` 标志，无法支持异步任务、人工等待和部分完成。
