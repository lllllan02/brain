---
title: "RAG 如何评测防幻觉策略，避免过度拒答？"
category: "RAG"
updated_at: "2026-10-05"
tags: ["RAG", "评测", "防幻觉", "拒答", "评分校准"]
classes: ["concept"]
---

准备有答案、检索为空、返回无关内容、只有部分答案和材料冲突的样本，标注支持证据及允许回答的范围。无答案样本检查是否编造，有答案样本检查是否正确回答或过度拒答，再据此调整提示词和拒答示例。自动评分需抽样人工复核。

> 尤其要测试「返回了内容，但内容没有答案」；只测试空检索，无法验证模型能否识别证据不足。

参考：[RAG 评测](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators)。
