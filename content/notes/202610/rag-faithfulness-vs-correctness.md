---
title: "Faithfulness / Groundedness 是什么，和答案正确性有什么区别？"
updated_at: "2026-10-05"
tags: ["Agent"]
classes: ["concept"]
---

# Faithfulness / Groundedness 是什么，和答案正确性有什么区别？

**Faithfulness / Groundedness 检查回答是否有给定证据支持，答案正确性检查回答是否符合可信的参考答案**。它们都能发现问题，但对照的依据不同，具体评分口径也可能不同。

例如，可信参考答案中的退款期限是 7 天，模型收到的旧材料却写着 30 天。模型回答 30 天，与给定材料一致，但答案仍然错误。反过来，材料根本没写期限，模型猜中了 7 天，答案虽然正确，也缺少给定证据支持。

Ragas 的 Faithfulness 将回答拆成事实陈述，计算「能由上下文支持的陈述数 / 回答中的陈述总数」。例如两项陈述只有一项有依据，得分为 1/2。该分数不直接衡量必要信息是否全部回答，也不保证材料本身正确；Groundedness 的具体实现应按所用评测工具的定义确定。

参考：[Ragas Faithfulness 的定义与计算方式](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/)。

## 相关内容

- 上级主题：[[rag-answer-evaluation|RAG 生成回答阶段如何评估答案质量？]]
