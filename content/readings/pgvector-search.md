---
title: "pgvector：精确搜索、近似索引与过滤"
category: "RAG"
tags: ["RAG"]
type: "article"
parent: "rag-embeddings"
created_at: "2026-10-13T10:49:42+08:00"
updated_at: "2026-10-13T11:04:51+08:00"
source: ["https://github.com/pgvector/pgvector#filtering", "https://github.com/pgvector/pgvector#iterative-index-scans", "https://arxiv.org/abs/1603.09320"]
---

pgvector 为 PostgreSQL 增加向量类型与距离查询，可与普通字段、事务和 JOIN 共存。本文节选 README 的 Indexing、Filtering 与 Iterative Index Scans；阅读日期为 2026-10-13，未实测性能。

## 索引怎样换取速度？

默认精确近邻搜索可以作为结果基准。HNSW 建立多层图；IVFFlat 将向量分到若干列表，查询探查部分列表。README 描述 HNSW 通常具有更好的速度与召回折中，但建索引较慢、内存更多；IVFFlat 需要代表性数据参与建索引。

HNSW 原论文摘要补充其分层思路：元素进入高层的概率递减，高层连接与低层连接对应不同距离尺度，查询从上层开始再逐层细化。这里仅补充算法定位，不覆盖邻居选择算法或把论文性能结论当作 pgvector 的性能保证。

提高 HNSW 的 `ef_search` 或 IVFFlat 的 `probes` 会增加搜索工作，以争取更高召回。这个召回指与精确近邻结果的重合，不等于业务证据完整率。

## WHERE 为什么仍可能只返回少量行？

近似索引扫描后应用过滤时，前面找到的候选可能大多不满足条件。README 从 0.8.0 起提供迭代扫描，继续扫描直到结果足够或达到资源上限；它不是无限搜索，也不恢复精确保证。

对选择性很高的过滤条件，普通字段索引加精确距离计算也可能合适；其他选择包括部分索引和分区。应比较「带实际过滤的查询」，不能用无过滤基准替代租户场景。距离运算符、索引算子类和 embedding 的度量约定也必须一致。
