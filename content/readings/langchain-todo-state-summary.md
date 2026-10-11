---
title: "LangChain：用待办工具维护任务进度"
parent: agent-task-state
category: "Agent"
tags: ["Agent", "状态管理"]
created_at: "2026-10-11T22:35:33+08:00"
updated_at: "2026-10-11T22:35:33+08:00"
source: "[Prebuilt middleware — To-do list](https://docs.langchain.com/oss/python/langchain/middleware/built-in#to-do-list)"
---

**LangChain 的 `TodoListMiddleware` 为 Agent 提供 `write_todos` 工具和规划提示，让多步骤任务可以显式维护待办。** 本文聚焦官方中间件文档的 To-do list 部分。

## 为什么要有专门工具？

跨多个工具的任务需要知道哪些步骤仍未完成。只在回复里写一次计划，后续行动未必持续更新它；中间件把任务规划和跟踪作为可调用的能力提供给模型。

它适合复杂的多步骤任务，以及需要展示进度的长时间操作。简单问答不一定需要待办清单。

## 框架提供什么？

配置 `TodoListMiddleware()` 后，框架加入 `write_todos` 工具，以及指导模型如何使用待办的系统提示。开发者可以通过 `system_prompt` 和 `tool_description` 修改这两类说明。

这里可借鉴的是「提示约束 + 更新工具」的分工：模型决定计划内容及调整时机，工具承接记录更新。工具存在不等于模型会及时使用；提示仍需说明何时更新，完成判断也需要执行反馈。

## 它没有替我们决定什么？

这一节介绍规划和跟踪能力，没有规定一套包含目标、约束、证据的完整任务状态格式，也没有承诺跨会话存储或压缩后的自动回填。应用时仍需决定状态保存在哪里，以及如何重新进入模型输入，不能把待办工具等同于全部上下文管理。
