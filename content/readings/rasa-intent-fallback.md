---
title: "Rasa：低置信度回退与分阶段澄清"
category: "Agent"
tags: ["Agent", "意图识别"]
created_at: "2026-10-13T17:37:13+08:00"
updated_at: "2026-10-14T13:59:35+08:00"
source:
  - "https://legacy-docs-oss.rasa.com/docs/rasa/components/#fallbackclassifier"
  - "https://legacy-docs-oss.rasa.com/docs/rasa/fallback-handoff/"
read: false
---

**Rasa 的回退分为两步：先发现分类不确定，再通过有限追问尝试恢复对话。** 检测组件本身不会自动生成完整的澄清流程。

本篇节选 legacy Rasa Open Source 3.x 的 FallbackClassifier 与 Two-Stage Fallback，不作为新版产品配置指南。

## 怎样判断分类不确定？

前一个分类器输出首选意图 `intent` 和候选列表 `intent_ranking`。FallbackClassifier 检查两种情况：最高分低于 `threshold`，或前两名分差小于 `ambiguity_threshold`；任一满足就输出 `nlu_fallback`，表示需要回退处理。

前者说明没有足够高的候选，后者说明难以区分。阈值只是分数上的判断规则，不代表真实正确率。

## 回退以后怎样追问？

检测不确定 → 让用户确认候选 → 否认则请求重新表述 → 再次判断 → 最终回退

Two-Stage Fallback 在重新分类仍不确定时再确认一次；再次否认后进入最终回退，例如转人工。确认候选后则恢复原流程。这样限制了恢复次数，避免反复问同一句，但候选未必包含用户真实目标。

## 哪些工作需要应用接上？

旧版配置涉及分类管线中的 FallbackClassifier、执行规则的 RulePolicy，以及触发 `action_two_stage_fallback` 的规则和回复。只添加分类器不会自动接通这些环节。

最终回退还需正确处理消息回退事件，避免澄清过程干扰后续状态。转人工通道由应用实现，回退标签本身不提供人工服务。
