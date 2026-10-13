---
title: "精确率（Precision@K）"
category: "信息检索"
updated_at: "2026-10-13T10:59:48+08:00"
tags: ["检索评测", "Precision"]
aliases: ["Precision@K", "Precision", "精确率"]
---

**Precision@K 衡量前 K 条结果里有多少是相关的**，同样只看前 K 条、按片段数量计算；它衡量的是**杂**——返回里混入的无关材料。

例：系统返回前 5 条、其中 3 条相关，则 Precision@5 = 3 / 5 = 60%。比较方案时要固定 K、片段划分和相关性标注口径；标准 Precision@K 仍以 K 为分母；若另报“返回项中的相关比例”，应标明分母为实际返回条数，不能混作同一口径。

和 [[recall-at-k|Recall@K]] 一起看时，注意「漏」与「杂」的取舍。

本篇按二值相关性计算；等级评分需先约定相关阈值。定义可核对 [[rag-evaluation-docs|ir-measures 指标导读]]。
