---
learning_status: understood
title: "Agent 的反馈与调整机制"
parent: agent
category: "Agent"
tags: ["Agent", "自我纠正", "重试", "任务规划"]
created_at: "2026-10-12T11:27:16+08:00"
updated_at: "2026-10-12T11:42:07+08:00"
---

**重试、反思、自我纠正和重新规划可以共同完成一次调整。它们描述不同职责，不是互斥的模块，也不是每次必经的固定步骤。**

## 各自负责什么？

| 机制 | 核心作用 |
| --- | --- |
| [[agent-retry\|重试（Retry）]] | 再次尝试操作，可以原样重发，也可以先修正再试 |
| [[agent-self-correction\|反思（Reflection）]] | 对照目标与证据检查问题，提出修改指导，也可判断无需修改 |
| 自我纠正（Self-Correction） | 根据反馈修改参数、行动或产物，并验证效果 |
| [[agent-replanning\|重新规划（Replanning）]] | 调整剩余步骤、依赖或策略，既可纠错，也可适应新目标 |

这里按职责区分：**「反思给出判断与指导，纠正落实修改并验证。」** 广义自我纠正可以包含反思，不要求拆成两个模块或两次模型调用；规则、工具和人工也能直接提供纠正依据。

## 怎样相互配合？

计划审查、执行错误和结果验收都能触发调整。下图用“结果缺少同比”展示两条纠正路径：已有数据就补结果，缺少数据则调整计划；反思可以帮助判断走哪条路。

![[assets/agent-feedback-mechanisms.png|重试、反思、自我纠正和重新规划共享反馈并协作，修改后返回计划或结果节点继续验证]]

**「按问题选择处理方式，不固定逐级升级。」** 暂时故障按[[retry-decision|重试决策]]处理；明确的参数错误可直接修正；需要分析时，按[[agent-reflection-design|有效反思的方法]]提供标准与证据。中断后从哪里继续，则由[[agent-checkpoint-recovery|检查点恢复]]处理。

框架名称可能覆盖多个职责：[[pydantic-retries-summary|Pydantic AI 的 Retry]]也包含模型修正，[[langgraph-replanning-summary|LangGraph 的 replan 示例]]同时检查进度与更新计划。应看实际行为；[[self-refine-summary|Self-Refine]]修改当前输出，[[reflexion-summary|Reflexion]]将反馈写成后续尝试可用的经验，后者是具体方法名。

所有路径都应保留有效成果、核查外部副作用与[[idempotency|幂等性]]，统一限制次数、耗时和费用。修改后验证；持续无进展或预算耗尽时停止，必要时[[agent-human-in-the-loop|转人工]]，不能靠反复尝试绕过权限。
