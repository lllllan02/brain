---
title: "RAG 回答相关性是什么，为什么答对事实也可能不切题？"
category: "RAG"
updated_at: "2026-10-05"
tags: ["RAG", "评测", "回答相关性", "Ragas"]
---

**回答相关性（Answer / Response Relevancy）检查答案是否直接回应用户的问题**。陈述的事实正确，仍可能没有完成用户要求。

例如，用户问「这件特价商品买了 10 天，还能退款吗？」，回答却只介绍如何提交退款申请。流程介绍即使完全正确，也没有回答「能否退款」。

评测时，对照问题检查回答是否作出了所需判断、回应了各个子问题，以及是否加入大量无关背景。Ragas 的回答相关性指标提供自动评分，用于估计答案与问题的匹配程度；它不验证事实正确性，仍需结合正确性和证据支持情况一起评估。

参考：[Ragas 回答相关性指标](https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/answer_relevance/)。
