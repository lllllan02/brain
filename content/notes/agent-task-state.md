---
learning_status: organized
parent: agent-context
title: "Agent 任务状态"
aliases: ["Agent Task State", "Task State"]
category: "Agent"
tags: ["Agent", "状态管理"]
created_at: "2026-10-09"
updated_at: "2026-10-17T19:44:45+08:00"
reading_suggestions:
  - agent-context
  - agent-task-state-update
  - langchain-todo-state-summary
  - context-loading
learning_status_changed_at: "2026-10-17T20:17:20.049+08:00"
---

**Agent 任务状态（Task State）是对当前任务的有效要求、执行进展和关键判断的显式记录。**

长任务只靠对话历史延续，模型就需要反复推断目标和进度；历史缩减后还可能遗漏要求。将这些信息独立维护，并在后续调用中读回，是[[agent-context|上下文管理]]的一种做法，[[anthropic-context-engineering-summary#长任务怎样延续？|外置笔记]]就是一个例子。

通常保留四类内容：

- 目标与约束：要完成什么、遵守什么限制、怎样验收。
- 进度与待办：哪些已完成、正在处理、尚未开始或受到阻塞。
- 结果与判断：已验证的事实、待验证的假设、关键决定及证据位置。
- 下一步：接下来做什么，还缺什么信息或条件。

记录可以使用[[manus-context-engineering-summary#如何避免行为偏离？|待办文件]]或结构化字段，[[langchain-todo-state-summary|待办工具]]可承接部分更新。模型依据新要求和执行证据[[agent-task-state-update|更新状态]]，程序保存，并将最新相关内容加入本轮上下文；详细材料保留引用，供后续[[context-loading|按需读取]]。

![[assets/agent-task-state-continuity.png|修复登录的假设示例：目标与约束保持不变，测试失败后更新进度与下一步，再将最新状态读入下一轮模型输入]]

用户要求、模型判断和执行结果应分清：「已受理」仍需等待结果，「推测修复」仍需验证。业务事实还应记录对象、来源与查询时间，关键操作前重新核实，避免把旧记录当成当前事实。
