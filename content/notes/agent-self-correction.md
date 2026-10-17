---
learning_status: organized
parent: agent
title: "Agent 自我纠正"
aliases: ["Self-Correction", "Self-correction", "Agent Self-Correction"]
category: "Agent"
tags: ["Agent", "自我纠正"]
created_at: "2026-10-09"
updated_at: "2026-10-17T18:24:22+08:00"
reading_suggestions:
  - agent-reflection
  - self-refine-summary
  - intrinsic-self-correction-summary
---

## 什么是自我纠正？

**自我纠正（Self-Correction）是 Agent 根据反馈修改自身输出或行为，并验证修正效果的过程。** 反馈可以来自反思、工具或用户。

## 为什么需要自我纠正？

反思发现问题、提出建议后，还需要实际修改才能改善结果。自我纠正承接这些建议，修复答案、参数或行动中的偏差，避免错误影响后续任务。

## 工程实践中何时、如何纠正？

通常在[[agent-reflection|反思]]确认需要修改之后纠正；原因和改法已经明确的错误，可以直接修正。

工程上，将反思结论交给模型继续执行即可，不要求另设模型或独立模块：

1. 承接依据：提供原任务、当前产物，以及反思指出的问题、证据、修改建议和验证办法；证据不足时先补查。
2. 落实修改：让模型[[self-refine-summary|依据具体反馈修订]]答案或提出工具调用，由程序执行必要操作。修改仍须遵守原有要求与权限。
3. 验证结果：用测试、规则、实际工具结果或人工反馈检查修复项及受影响的原有要求，通过后接受修改；失败则将结果带回反思，调整后再修。

[[intrinsic-self-correction-summary|无外部反馈的推理纠正实验]]中曾出现把正确答案改错的情况，因此模型声称「已修好」不能代替验证。验证通过即结束；持续无进展或达到预算上限时停止，并说明未解决项。
