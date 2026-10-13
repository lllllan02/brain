---
title: "Langfuse：可用于调试和评测的 Trace"
category: "可观测性"
tags: ["Agent", "Trace", "可观测性", "数据脱敏"]
created_at: "2026-10-12T23:19:16+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://langfuse.com/docs/observability/best-practices"
  - "https://langfuse.com/docs/observability/data-model"
  - "https://langfuse.com/docs/observability/features/masking"
  - "https://github.com/langfuse/langfuse"
---

**「Langfuse 把执行步骤、输入输出与评分组织在同一套观测数据中；Trace 的粒度和命名会直接影响调试、筛选与评测。」** 本文节选追踪结构和内容采集相关文档，核对日期为 2026-10-12，未部署仓库或验证 SDK 行为。

## 如何组织一次运行？

[数据模型](https://langfuse.com/docs/observability/data-model) 以 observation 表示单个步骤，同一 `trace_id` 组成一条 Trace，多条 Trace 可用 `session_id` 关联。一次 Agent 运行或聊天的一轮可作为一个工作单元，多轮交互再按会话查看。

[最佳实践](https://langfuse.com/docs/observability/best-practices) 要求每次模型调用分别记录为 generation，工具执行作为 tool，按运行系统的实际包含关系嵌套。模型调用和它提出的工具调用可同属一个 Agent 父节点。若整轮循环只留一个 generation，就会失去每次工具反馈后的模型输入、输出和用量变化。

## 为什么名称和输入输出也影响评测？

评测器与看板会按步骤名称和类型筛选数据，因此**「名称应稳定，动态 ID 和重试次数放属性」**。根 observation 的输入输出应便于审核整项任务；细节载荷放到对应步骤。模型名、token 用量、Prompt 版本与环境信息则帮助比较不同运行；评分与用户反馈用于补充质量判断。

## 采集能力的边界

[Masking 文档](https://langfuse.com/docs/observability/features/masking) 提供**「发送前处理敏感数据」**的方法。脱敏后能分析什么，取决于保留了哪些信息；只保留摘要时，不能据此声称已保存模型实际看到的完整上下文。

最佳实践还建议记录 thinking。这里必须限定为「接口实际返回且允许保存的推理内容或摘要」：追踪系统无法自行取得托管模型未暴露的内部推理，模型输出的解释也不能单独证明决策原因。

[开源仓库](https://github.com/langfuse/langfuse) 提供平台实现与自托管入口。它承担观测、查看与评测等平台工作；[[openinference-tracing|OpenInference]] 主要提供语义和埋点能力，两者分工存在层次差异，是否组合要核对具体集成支持。
