---
learning_status: pending
title: "Agent 评测工具选型"
parent: agent-evaluation
category: "Agent"
tags: ["Agent", "评测"]
created_at: "2026-10-13T11:00:15+08:00"
updated_at: "2026-10-13T11:00:15+08:00"
reading_suggestions:
  - inspect-agent-evaluation
  - harbor-evaluation
  - agentevals-trajectory
  - promptfoo-evaluation
  - langfuse-dataset-experiments
  - langsmith-evaluation
---

**评测工具应按缺少的能力选择：运行任务、组织数据与实验、计算分数是三个不同职责。** 先明确数据、环境和验收，再接入能减少重复工作的工具。

## 同层工具怎样比较？

| 职责 | 方案 | 适合的已有条件 | 需要自己补齐 |
| --- | --- | --- | --- |
| 通用评测执行 | [[inspect-agent-evaluation\|Inspect]] | 需要代码组合数据、Agent、评分器与重复实验 | 业务工具、环境和验收规则 |
| 环境任务执行 | [[harbor-evaluation\|Harbor]] | 任务以容器、终端和可执行产物为中心 | 任务包、参考解与可靠测试 |
| 数据与实验平台 | [[langfuse-dataset-experiments\|Langfuse]] | 已有 Trace，希望关联样本、运行和评分 | 任务适配、预期结果与环境恢复 |
| 数据与实验平台 | [[langsmith-evaluation\|LangSmith]] | 需要离线比较、线上评测与人工审核流程 | 业务标注、指标及应用集成 |
| 配置式回归 | [[promptfoo-evaluation\|Promptfoo]] | 已有可调用入口，想比较 Prompt、模型或应用 | 复杂环境生命周期与状态证据 |
| 局部评分库 | [[agentevals-trajectory\|AgentEvals]] | 已有消息轨迹，需匹配工具行为 | 结果状态验收和裁判校准 |

平台与评分库可以组合，不应把二者当成互斥产品。RAG 的检索和证据指标继续使用[[rag-evaluation-docs|Ragas 与 LangSmith 的专项方法]]；这些局部指标不能自动替代整项 Agent 任务成功。

## 怎样缩小选择？

已有 Langfuse Trace 的项目，先复用数据集和实验关联，补独立评分与环境重置；引入另一平台前确认它解决了当前平台未满足的问题。若主要困难是隔离环境和可执行验收，优先试 Inspect 或 Harbor 的任务组织，而不是先建设评分看板。

在 Inspect 与 Harbor 之间，先判断任务是可组合的评测程序，还是自包含的环境任务包。在 Langfuse 与 LangSmith 之间，用相同小数据集比较现有埋点接入、人工审核、实验检索与结果导出是否顺手；价格、部署和权限能力需按采用时版本另核对，本文不作未验证的优劣排名。

## 试用时验证什么？

选择包含成功、业务失败和设施错误的少量任务，核对能否替换 Agent、隔离 trial、保存评分证据、固定版本、导出原始结果和重新评分。再观察多人标注、CI 和线上数据接入是否符合需求。

不要只看是否内置很多指标。指标名称相同，其输入、参考物和缺失处理也可能不同。先检查一次错误退款能否被准确识别，并从分数定位到具体证据，再决定是否扩大接入。

上述选择依据来自组件分工与官方文档，尚未完成这些平台的同条件部署比较。
