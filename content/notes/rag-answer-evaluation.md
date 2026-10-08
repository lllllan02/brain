---
title: "RAG 生成回答评测（Answer Evaluation）"
category: "RAG"
updated_at: "2026-10-08"
tags: ["RAG", "评测", "答案生成", "答案正确性", "忠实度", "引用校验"]
aliases: ["生成回答评测", "Answer Evaluation"]
---

**评估生成回答，看模型拿到证据后是否正确使用它、并回应用户的问题。**

- **结论是否正确**：对照可信的参考答案检查条件应用、推理和结论，记录答案正确率，识别「证据已经给出、模型仍答错」的情况。
- **事实陈述是否有依据**：用忠实度（faithfulness）或依据一致性（groundedness）检查陈述能否由最终上下文支持，识别凭空补充或与证据矛盾的内容。
- **回答是否切题**：用回答相关性（answer relevancy）检查是否直接回应用户所问，避免只复述相关背景却没作出所需判断。
- **引用是否支持结论**：核对引用原文与回答陈述，检查来源、结论及限制条件是否匹配。

完整性简要记为必要事实的回答覆盖率，重点看「证据已在上下文里、但答案没正确表达」；正确性对照参考答案、忠实度对照给定证据、相关性对照用户问题，三者分别评分。

固定问题、最终上下文和评分口径来比较生成方案，答案正确率与检索指标分开记录；证据不足时检查是否如实说明缺口；自动语义评分需人工样本校准和抽查。参考 [Ragas 忠实度](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/) 与 [回答相关性](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/answer_relevance/)。
