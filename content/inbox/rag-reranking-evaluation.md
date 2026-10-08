---
title: "RAG 重排评测（Reranking Evaluation）"
category: "RAG"
updated_at: "2026-10-08"
tags: ["RAG", "检索评测", "重排", "NDCG", "MRR"]
aliases: ["重排评测", "Reranking Evaluation"]
---

**评估重排看的是：同一批候选里，更有价值的证据有没有被排到更靠前的位置。**

- **整体排序好不好**：用 [[rag-ndcg|NDCG@K]] 对照人工标注的相关性等级，看重排后的顺序离理想顺序有多近。
- **第一条相关结果够不够早**：用 [[rag-mrr|MRR]] 衡量首个相关结果的排名；它只看第一个命中，不代表后续材料的排序。
- **代价能不能接受**：记录重排增加的耗时和费用，结合排序指标的改善判断值不值。

还要在**相同保留条数**下比较必要事实覆盖率，检查关键证据是否被排到截取范围之外——这里关注的是「候选集里已有、但排序后没被选中」，不是重新判断召回有没有找全。

比较重排方案时固定候选集、标注口径和 K，避免把召回的变化误当成排序改善。指标口径见 [Microsoft 的 RAG 评估](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators)。
