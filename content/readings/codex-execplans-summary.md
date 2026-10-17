---
title: "Codex：用可验证里程碑推进长任务"
parent: agent-task-decomposition
category: "Agent"
tags: ["Agent", "任务规划", "状态管理"]
created_at: "2026-10-17T17:20:29+08:00"
updated_at: "2026-10-17T17:20:29+08:00"
read: false
source:
  - "[Using PLANS.md for multi-hour problem solving](https://developers.openai.com/cookbook/articles/codex_exec_plans)"
  - "[Run long horizon tasks with Codex](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex)"
---

**两篇 OpenAI 资料通过持久计划、可验证里程碑和持续更新的状态，把长时间编码组织成能够检查与接续的工作。** 前篇提供计划规范，后篇报告一次应用开发实验；本文聚焦任务拆分与执行，不覆盖产品配置或模型选型。

## ExecPlans 怎样定义一个可执行阶段？

2025-10-07 的 Cookbook 先建议在项目规则中指定：复杂功能或重要重构使用执行计划。`ExecPlan` 是作者为这类文档约定的名称，需要项目提供定义，并非模型自动识别的内置协议。

计划面向只有当前工作树、没有聊天历史的执行者，因此必须包含目标、相关代码、操作和验证依据。每个里程碑描述范围、完成后新增的结果、要运行的命令及预期现象；要求各阶段能够分别验证，并逐步实现整体目标。只增加类型或通过编译，未必证明用户行为可用。

重要未知可以先设为原型阶段，明确如何验证可行性，以及采用或放弃原型的条件。计划随发现和决定更新，进度分别记录完成项与剩余项；中途失败的操作需说明重试或恢复方法，便于下一次接续。

[原文](https://developers.openai.com/cookbook/articles/codex_exec_plans)的 `Milestones`、`Living plans and design decisions`、`Prototyping milestones and parallel implementations` 给出具体要求。页面现已标为归档，模板中的完整章节、格式和提交要求是该方案的约定，不能当作所有任务的必选项；它也没有给出统一的阶段大小阈值。

## 长时间开发实验怎样使用里程碑？

[后篇案例](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex#the-key-idea-durable-project-memory)开发带画布、数据模型和编辑操作的设计工具。作者将材料分为四部分：规格保存目标、约束和完成条件；计划保存里程碑及验证方式；执行指引规定推进与修复方式；状态文档记录进度、决定和已知问题。

计划要求阶段足够小、能够完成和验证；验证失败先修复，再推进。这样，Agent 反复读取文件即可确认目标与进展，无需完全依赖持续增长的会话历史。

作者报告 GPT-5.3-Codex 在 Extra High 下连续运行约 25 小时，并对里程碑执行测试等检查；同时承认产物尚非生产就绪。这是带特定规格和执行约束的一次案例，不是拆分策略的对照基准，也不能推出任意任务都能稳定运行相同时长。

2026-10-17 核对；未运行案例代码或复现结果。原文的「一个 loop」没有被定义为固定工具调用次数，不应据此制定步数阈值。
