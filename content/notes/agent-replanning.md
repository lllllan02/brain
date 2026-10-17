---
learning_status: organized
parent: agent-planning
title: "重新规划"
aliases: ["Replan", "重新规划", "计划调整"]
category: "Agent"
tags: ["Agent", "任务规划"]
created_at: "2026-10-12T00:56:04+08:00"
updated_at: "2026-10-17T18:42:40+08:00"
reading_suggestions:
  - agent-task-state-update
  - langgraph-replanning-summary
  - agent-trace
learning_status_changed_at: "2026-10-17T18:46:38.383+08:00"
---

**重新规划（Replanning）是根据执行反馈或新要求，调整任务剩余步骤、顺序或策略的过程。**

初始计划基于当时已知的信息。执行带来新证据，目标与条件也可能变化；重新规划让后续安排适应这些变化，避免沿失效路线继续工作。

## 什么时候需要重新规划？

新证据改变判断、目标或约束变化、原路线无法继续时，都应检查**「原计划是否仍能达成目标」**。下图展示三类情形及相应调整，仍有效的成果可以保留。

![[assets/agent-replanning-update.png|重新规划的三类触发：新证据、目标或约束变化、原路线无法继续；保留有效成果并调整剩余工作]]

检查不等于必须改计划，也不以工具是否报错为准。临时故障可有限[[agent-retry|重试]]，参数或答案错误可局部[[agent-self-correction|纠正]]；需要改变剩余安排时，才涉及重新规划。

## 工程实践

1. 什么时候检查：可像 [[langgraph-replanning-summary|LangGraph 示例]]在计划步骤完成后检查，或像 [[smolagents-planning-summary|smolagents]]按行动步数定期更新；出错、目标变更等事件也可触发。一个计划步骤可能包含多轮行动，检查频率需权衡调用成本与纠偏及时性。
2. 怎么调整：模型结合目标、约束、当前计划和执行结果，判断继续、调整或结束；证据不足先补查，需要调整则生成剩余步骤与理由。涉及目标取舍时由用户确认。
3. 怎么生效：程序校验依赖、权限与预算，通过后更新[[agent-task-state-update|任务状态]]，保留调整依据供[[agent-trace|追查]]，停止派发失效步骤。已发出的外部操作需核对结果，改计划不会自动撤销它们。

频繁改计划可能让有效方案尚未验证就被放弃。设置调整次数或资源上限，超限停止并说明原因；满足验收条件才算完成。
