---
title: "NDCG@K（归一化折损累计增益）"
category: "RAG"
updated_at: "2026-10-08"
tags: ["RAG", "检索评测", "排序指标", "NDCG"]
aliases: ["NDCG", "NDCG@K", "归一化折损累计增益"]
---

**NDCG@K 衡量前 K 条结果的排序与理想排序有多接近**：K 是只检查前多少条，理想排序由人工标注的相关性等级决定。

它对「把相关材料排前面」敏感：相关性越高的片段贡献越大，同一片段放得越靠后、贡献越小；再用实际排序得分除以理想排序得分，得到 0 到 1 之间的 NDCG，越接近 1 越好。

例：人工把三个片段标成「直接回答」「部分帮助」「无关」，把「直接回答」排在前面，就比把「无关」排在前面得分更高。

评测时要统一相关性等级、计算方式和 K，没有相关证据的问题单独处理。**NDCG 高不等于回答所需的信息齐全**——它衡量标注相关性的排序表现，不检查不同条件或例外是否都被覆盖。口径见 [Microsoft 的 NDCG 说明](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators)。
