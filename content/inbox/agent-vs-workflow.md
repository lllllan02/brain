---
parent: agent-capabilities
title: "Agent 与工作流有什么区别"
category: "Agent"
updated_at: "2026-10-09"
tags: ["Agent", "工作流", "自主决策", "工程选型"]
---

**[[workflow|工作流（Workflow）]]按预设规则决定执行路径，[[agent-definition-and-boundaries|Agent]] 由模型根据目标和执行结果决定下一步动作。** 核心区别是「谁决定下一步」；两者都可以调用模型。

## 如何选择

- 选择 Workflow：业务步骤相对固定，交给 Agent 大致也会走相同流程；尤其重视执行稳定、过程可控时，可以预先编排必要步骤与检查规则。
- 选择 Agent：执行路径难以预先确定，需要根据中间结果动态选择工具、调整行动或决定是否继续。

两者可以结合：Workflow 编排整体流程，Agent 负责需要动态决策的环节。固定流程能减少执行路径的不确定性，但不保证任务一定成功。
