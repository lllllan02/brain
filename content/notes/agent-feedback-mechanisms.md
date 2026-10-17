---
learning_status: reading
title: "Agent 的反馈与调整机制"
parent: agent
category: "Agent"
tags: ["Agent", "自我纠正", "重试", "任务规划"]
created_at: "2026-10-12T11:27:16+08:00"
updated_at: "2026-10-17T18:54:21+08:00"
reading_suggestions:
  - agent-retry
  - agent-reflection
  - agent-self-correction
  - agent-replanning
  - agent-checkpoint-recovery
  - agent-human-in-the-loop
learning_status_changed_at: "2026-10-17T18:56:50.838+08:00"
---

**重试、反思、自我纠正和重新规划可以共同完成一次调整。它们描述不同职责，不是互斥的模块，也不是每次必经的固定步骤。**

## 各自负责什么？

| 机制 | 核心作用 |
| --- | --- |
| [[agent-retry\|重试（Retry）]] | 再次尝试操作，可以原样重发，也可以先修正再试 |
| [[agent-reflection\|反思（Reflection）]] | 对照目标与证据检查问题，提出修改指导，也可判断无需修改 |
| [[agent-self-correction\|自我纠正（Self-Correction）]] | 根据反馈修改参数、行动或产物，并验证效果 |
| [[agent-replanning\|重新规划（Replanning）]] | 调整剩余步骤、依赖或策略，既可纠错，也可适应新目标 |

这里按职责区分：**「反思给出判断与指导，纠正落实修改并验证。」** 广义自我纠正可以包含反思，不要求拆成两个模块或两次模型调用；规则、工具和人工也能直接提供纠正依据。

## 怎样相互配合？

计划审查、执行错误和结果验收都能触发调整。下图用“结果缺少同比”展示两条纠正路径：已有数据就补结果，缺少数据则调整计划；反思可以帮助判断走哪条路。

![[assets/agent-feedback-mechanisms.png|重试、反思、自我纠正和重新规划共享反馈并协作，修改后返回计划或结果节点继续验证]]

**「按问题选择处理方式，不固定逐级升级。」** 暂时故障按[[retry-decision|重试决策]]处理；明确的参数错误可直接修正；需要分析时，按[[agent-reflection#怎样组织一次反思？|反思的组织方式]]提供标准与证据。中断后从哪里继续，则由[[agent-checkpoint-recovery|检查点恢复]]处理。

框架名称可能覆盖多个职责：[[pydantic-retries-summary|Pydantic AI 的 Retry]]也包含模型修正，[[langgraph-replanning-summary|LangGraph 的 replan 示例]]同时检查进度与更新计划。应看实际行为；[[self-refine-summary|Self-Refine]]修改当前输出，[[reflexion-summary|Reflexion]]将反馈写成后续尝试可用的经验，后者是具体方法名。

反思提出建议后，由自我纠正落实修改，再按原要求验证；未通过时携带问题与证据继续修订，必要时重新反思。**「验证通过，才能接受修改。」**

所有路径都应保留有效成果、核查外部副作用与[[idempotency|幂等性]]，统一限制次数、耗时和费用。持续无进展或预算耗尽时停止，必要时[[agent-human-in-the-loop|转人工]]，不能靠反复尝试绕过权限。

## 同一个错误，为什么会同时触发多种恢复？

工具超时后，SDK 自动重发；模型收到错误又改参数；外层任务判断失败后重新规划。各层单看都有理由，但组合起来可能重复写入，并让排障人员不知道最终成功来自哪次尝试。

可以按失败交给不同责任方：连接故障由调用层判断能否安全重发，参数不合法由模型修正，证据不足先补查，关键前提失效才重新规划。写操作结果未知时先进入核对流程，不能同时启动「重试」和「换方案执行」。每条恢复路径应返回明确结果，再由上层决定下一步。

各机制还需要共享任务期限与预算。一次反思批准了新尝试，也不能绕过已经耗尽的资源限制；失败原因与停止原因应分别保存，便于区分服务故障和恢复策略失控。
