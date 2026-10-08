---
title: "MRR（平均倒数排名）"
category: "RAG"
updated_at: "2026-10-08"
tags: ["RAG", "检索评测", "排序指标", "MRR"]
aliases: ["MRR", "Mean Reciprocal Rank", "平均倒数排名"]
---

**MRR（平均倒数排名，Mean Reciprocal Rank）衡量第一条相关结果出现得有多早**：每个测试问题先取「第一条相关结果排名的倒数」，再对所有测试问题求平均；分数越高，第一条相关结果通常越靠前。

例：第一条相关结果排第 1 位，该题得 1；排第 2 位，得 1/2。两个测试问题分别得 1 和 1/2，则 MRR = (1 + 1/2) / 2 = 0.75。检查范围内没有相关结果时，该题记 0。

**MRR 只看第一条相关结果，[[rag-ndcg|NDCG@K]] 看前 K 条的相关性和排序**——第一条已经相关、后面却缺少其他必要证据时，MRR 仍可能很高。所以需要多条证据才能回答的问题，不能只看 MRR。定义见 [ir-measures 的 RR](https://ir-measur.es/en/latest/measures.html#rr)。
