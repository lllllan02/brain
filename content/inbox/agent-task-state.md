---
parent: agent
title: "Agent 任务状态管理"
aliases: ["Agent Task State", "Task State Management"]
category: "Agent"
tags: ["Agent", "状态管理"]
created_at: "2026-10-09"
updated_at: "2026-10-10T21:10:22+08:00"
---

**Agent 任务状态管理是把当前任务的目标、计划、进度、关键结果和待处理事项，作为独立记录持续维护的机制。** 这里的「状态」具体包括以下内容，不只是「运行中、完成、失败」这样的进度标签。

| 内容 | 修复登录故障的假设示例 |
| --- | --- |
| 目标、约束与完成条件 | 修复登录故障，保持接口兼容，相关测试通过 |
| 任务与计划 | 定位原因、修改代码、验证修复 |
| 进度 | 定位与修改已完成，验证未通过 |
| 关键结果与判断 | 测试返回 401；怀疑使用了旧令牌，尚未验证 |
| 待处理事项 | 检查重试时读取令牌的逻辑 |

这些状态是从上下文中提取的重要任务信息，单独维护是为了避免[[agent-context|上下文管理]]的裁剪或压缩导致遗漏、失真。[外置笔记实践](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents#context-engineering-for-long-horizon-tasks)

## 怎样管理？

单独维护这些信息，还需要明确以下几件事：

- [[agent-task-state-detail|记录到什么程度]]：详略按任务判断，但关键要求、实际进度与未解决事项不能失真。
- [[agent-storage|用什么格式、存在哪里]]：按人、模型和程序的读写需求，以及持久化、查询与并发需求选型。
- [[agent-task-state-update|由谁、依据什么更新]]：模型根据用户要求、工具结果和验证更新，程序负责保存与必要校验。
- [[agent-task-state-input|怎样提供给模型]]：每次相关调用提供最新状态，详细材料保留引用、按需读取。
- [[agent-task-state-conflicts|新旧要求冲突时怎么办]]：明确的修改直接更新；要求互斥且替换意图不明时向用户确认。

## 实践参考

Claude Code 与 Codex 分别维护了以下任务信息，可作为设计参考；这不是所有 Agent 必须采用的统一字段清单。以下依据截至 2026-10-09 查阅的官方资料。

| 实例 | 维护的内容与边界 |
| --- | --- |
| Claude Code Task list | 待办项及待执行、执行中、已完成的进度；任务能跨上下文压缩保留。它与运行 shell、子 Agent 的后台任务视图分开。[Task list](https://code.claude.com/docs/en/interactive-mode#task-list) |
| Codex Plan | 计划步骤及 `pending`、`inProgress`、`completed` 状态；App Server 在计划变化时发送更新通知。[Plan 通知](https://learn.chatgpt.com/docs/app-server#notifications) |
| Codex Goal | 当前线程的持久目标、生命周期、预算与进度计量；它不属于全局记忆或项目指令。[Goal 设计](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex#how-goals-are-designed-in-codex) |
