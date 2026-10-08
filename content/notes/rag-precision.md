---
title: "精确率（Precision@K）"
category: "RAG"
updated_at: "2026-10-07"
tags: ["RAG", "检索评测", "Precision"]
aliases: ["Precision@K", "Precision", "精确率"]
---

**Precision@K 衡量前 K 条结果里有多少是相关的**，同样只看前 K 条、按片段数量计算；它衡量的是**杂**——返回里混入的无关材料。

例：系统返回前 5 条、其中 3 条相关，则 Precision@5 = 3 / 5 = 60%。比较方案时要固定 K、片段划分和相关性标注口径；**返回不足 K 条时，要明确精确率按固定 K 还是实际返回条数计算**。

和 [[rag-recall|Recall@K]] 一起看时，注意「漏」与「杂」的取舍。
