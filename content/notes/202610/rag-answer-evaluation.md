---
title: "RAG 生成回答阶段如何评估答案质量？"
updated_at: "2026-10-05"
tags: ["Agent"]
classes: ["concept"]
---

# RAG 生成回答阶段如何评估答案质量？

评估生成回答，重点是 **模型拿到证据后，是否正确使用它并回应用户的问题**。主要看四件事：

1. **结论是否正确？** 对照可信的参考答案检查条件应用、推理和结论，记录答案正确率，识别「证据已经给出，模型仍答错」的情况。
2. **事实陈述是否有依据？** 用忠实度（Faithfulness）或依据一致性（Groundedness）检查陈述能否由最终上下文支持，识别凭空补充或与证据矛盾的内容。
3. **回答是否切题？** 用回答相关性（Answer / Response Relevancy）检查是否直接回应用户所问，避免只复述相关背景却没有作出所需判断。
4. **引用是否支持对应结论？** 核对引用原文与回答陈述，检查来源、结论及限制条件是否匹配。

完整性简要记录为必要事实的回答覆盖率，重点检查「证据已在上下文中，但答案没有正确表达」的遗漏。正确性对照参考答案，忠实度对照给定证据，相关性对照用户问题，三者分别评分。

固定问题、最终上下文和评分口径比较生成方案，答案正确率与检索指标分开记录。证据不足时检查是否如实说明缺口；自动语义评分需人工样本校准和抽查。

参考：[Ragas 忠实度指标](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/)、[回答相关性指标](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/answer_relevance/)。

## 相关内容

- 上级主题：[[rag-quality-evaluation|如何评估 RAG 的检索与回答质量？]]
- 展开：[[rag-faithfulness-vs-correctness|Faithfulness / Groundedness 是什么，和答案正确性有什么区别？]]
- 展开：[[rag-answer-relevancy|RAG 回答相关性是什么，为什么答对事实也可能不切题？]]
