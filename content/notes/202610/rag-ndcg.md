---
title: "NDCG@K 是什么，怎样判断排序好不好？"
updated_at: "2026-10-05"
tags: ["Agent"]
classes: ["concept"]
---

**NDCG@K 衡量前 K 条结果的排序与理想排序有多接近**。K 表示检查前多少条；理想排序由人工标注的相关性等级决定。

例如，人工将三个片段标为「直接回答问题」「提供部分帮助」「无关」。把直接回答问题的片段排在前面，会比把无关片段排在前面得到更高的分数。

计算时，相关性越高的片段贡献越大；同样的片段放得越靠后，贡献越小。再用实际排序的得分除以理想排序的得分，得到 NDCG，通常在 0 到 1 之间，越接近 1 越好。评测时要统一相关性等级、计算方式和 K；没有相关证据的问题应单独处理。

**NDCG 高不保证回答所需的信息齐全**。它衡量标注相关性的排序表现，不直接检查不同条件或例外是否都被覆盖。

参考：[Microsoft 对 NDCG 的说明](https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators)。
