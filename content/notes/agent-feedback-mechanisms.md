---
learning_status: organized
title: "Agent 的反馈与调整机制"
parent: agent
category: "Agent"
tags: ["Agent", "自我纠正", "重试", "任务规划"]
created_at: "2026-10-12T11:27:16+08:00"
updated_at: "2026-10-17T19:12:39+08:00"
reading_suggestions:
  - agent-retry
  - agent-reflection
  - agent-self-correction
  - agent-replanning
  - agent-checkpoint-recovery
  - agent-human-in-the-loop
learning_status_changed_at: "2026-10-17T19:16:22.627+08:00"
---

Agent 遇到执行错误、结果不符要求，或目标与条件变化时，需要依据反馈调整行动。**反馈帮助确定改什么，修改后还要验证是否满足要求。** 重试、反思、自我纠正和重新规划参与这一过程，各机制按需组合。

## 怎样相互配合？

![[assets/agent-feedback-cooperation.png|反馈如何经按需反思进入纠正，选择局部修改或重新规划，执行时可重试，修改后验证并接受或继续调整]]

收到反馈后，原因或改法不清楚时，通过[[agent-reflection|反思（Reflection）]]对照目标与证据，判断问题并提出建议；也可能确认无需调整。改法已经明确时，可直接纠正。

确定需要修改后，由[[agent-self-correction|自我纠正（Self-Correction）]]落实到参数、行动或产物，并验证效果。**「反思给出建议，纠正执行修改。」** 二者不要求拆成独立模块。

若局部修改不足以完成任务，就通过[[agent-replanning|重新规划（Replanning）]]调整剩余步骤、依赖或策略，再执行更新后的安排；本例中，它是纠正的一种方式，也可用于适应新目标。

执行中遇到暂时故障，可通过[[agent-retry|重试（Retry）]]再次尝试当前操作，无需整段任务从头开始；参数有误则先修正再试。是否可以安全重做，按[[retry-decision|重试决策]]判断。

修改后按原要求验证：通过才接受；未通过则携带新证据继续调整，必要时再反思；证据不足先补查。**「这些机制没有固定的必经顺序。」**

## 共同边界

保留有效成果，只重做必要部分。写操作结果未知时先核查是否生效，结合[[idempotency|幂等性]]避免重复副作用；各层明确恢复责任，共享次数、耗时与费用预算。持续无进展或预算耗尽时停止，必要时[[agent-human-in-the-loop|转人工]]，调整仍须遵守原有权限。

任务中断后从哪里继续，由[[agent-checkpoint-recovery|检查点恢复]]处理；恢复执行后仍可使用这些调整机制。
