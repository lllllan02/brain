---
title: "Rasa：低置信度回退与分阶段澄清"
category: "Agent"
tags: ["Agent", "意图识别"]
created_at: "2026-10-13T17:37:13+08:00"
updated_at: "2026-10-13T17:37:13+08:00"
source:
  - "https://legacy-docs-oss.rasa.com/docs/rasa/components/#fallbackclassifier"
  - "https://legacy-docs-oss.rasa.com/docs/rasa/fallback-handoff/"
read: false
---

**Rasa 把「检测识别不确定」与「决定如何回应」分给不同组件。** 以下节选 legacy Rasa Open Source 3.x 文档的 FallbackClassifier 与 Two-Stage Fallback，用于理解传统 NLU 的回退机制，不作为新版产品配置指南。

## 怎样触发回退？

FallbackClassifier 读取前一个分类器的 `intent` 与 `intent_ranking`。最高分低于 `threshold`，或前两名分差小于 `ambiguity_threshold` 时，输出 `nlu_fallback`。前者表示没有足够高的候选，后者表示候选难以区分。

它不负责生成澄清问题。应用还需通过规则把 `nlu_fallback` 接到回复或处理动作；只添加分类组件不会自动完成对话恢复。这里的分数阈值也不等于真实正确率。

## 怎样接着问，而非无限重试？

Two-Stage Fallback 先让用户确认候选意图；确认后恢复原流程，否认则请求换一种说法。重新分类仍不确定时，再确认一次；再次否认后进入最终回退，例如转人工。

接入涉及 pipeline 中的 FallbackClassifier、RulePolicy、触发 `action_two_stage_fallback` 的规则，以及澄清与最终回退回复。文档还要求最终回退正确处理用户消息回退事件，避免澄清期间的状态干扰后续策略。

这套流程提供了有限次数的恢复路径，不能保证候选一定覆盖真实意图；转人工通道仍需应用另行实现。
