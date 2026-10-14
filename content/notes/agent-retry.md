---
learning_status: understood
parent: agent
title: "Agent 重试"
aliases: ["Agent Retry", "Task Retry"]
category: "Agent"
tags: ["Agent", "重试"]
created_at: "2026-10-09"
updated_at: "2026-10-12T11:27:16+08:00"
reading_suggestions:
  - retry-decision
  - retry-wrapper
  - pydantic-retries-summary
  - agent-checkpoint-recovery
  - agent-feedback-mechanisms
---

**Agent 重试（Retry）是在调用失败或校验未通过后，按策略再次尝试相应操作的恢复机制。** 它可以接入模型请求、工具执行、输出校验和任务步骤，并非 Agent 主链路中的固定一步。

## 在哪些环节接入？

| 入口与触发信号 | 谁处理、再次做什么 |
| --- | --- |
| 模型请求失败：暂时断连、服务故障或短期限流 | SDK 或调用包装器按策略重发请求；请求格式、上下文长度等问题需先修正 |
| 工具执行失败：暂时故障，或参数校验未通过 | 暂时故障由程序有限重试；参数错误反馈给模型，修正调用后再执行 |
| 模型输出未通过校验：格式、结构或业务要求不满足 | 校验器返回具体问题，程序再次调用模型生成或修正输出，再做校验 |
| 任务步骤最终失败或运行中断 | Runtime 或调度器核对状态与已完成操作，决定从哪里恢复；依据[[agent-checkpoint-recovery\|State / Checkpoint]]继续，不默认整段重跑 |

[[pydantic-retries-summary|Pydantic AI 的重试分层]]区分了底层请求重发、模型修正与工作流重执行：底层重发通常对模型不可见，修正调用或输出则会增加模型往返。接入位置可采用[[langchain-harness-middleware-summary|包裹模型调用或工具调用的中间件]]。

## 怎样执行和停止重试？

失败或校验未通过 → 判断是否值得、安全地再试 → 确定重做范围 → 等待或修正 → 再次尝试 → 检查结果。

错误分类、幂等性和等待规则沿用[[retry-decision|错误分类与重试决策]]，具体次数、退避、取消与日志可由[[retry-wrapper|重试包装器]]处理。保留三个边界：

- **「只重做必要范围」**：超时不代表操作未生效，写操作结果未知时先核查，避免重复副作用。
- **「局部限制加总预算」**：SDK 重发、工具修正和任务恢复可能分别计数，仍需统一限制总耗时、调用量和费用。
- **「再次尝试不等于成功」**：重新生成可能得到不同输出，仍需验证；不可重试、用户取消或预算耗尽时停止，必要时交给上层换方案。

![[assets/agent-retry-scopes.png|Agent 重试：模型请求、工具查询和输出修正的局部循环与停止条件]]

## 与其他机制怎样配合？

这几种机制的职责与组合关系，见[[agent-feedback-mechanisms|反馈与调整机制]]。

**「重试负责再次尝试，Reflection 负责检查问题并提出修改指导。」** 两者可以组合，但重试不一定需要模型反思。

例如，同一次查询遇到暂时断连，可在确认安全后等待重发；若查询参数填错，就先校验或反思、修正参数，再尝试。[[agent-self-correction|反思与自我纠正]]解决的是「改什么」，再次执行是落实纠正的一步；若需要改变剩余任务的步骤或策略，则进入[[agent-replanning|重新规划]]。
