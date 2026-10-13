---
title: "检索官方文档：词项评分、语义表示、融合与重排"
category: "RAG"
tags: ["RAG"]
type: "article"
parent: "rag-retrieval"
created_at: "2026-10-13T10:49:42+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: ["https://sbert.net/examples/sentence_transformer/applications/retrieve_rerank/README.html", "https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking", "https://sbert.net/examples/sentence_transformer/applications/semantic-search/README.html", "https://www.elastic.co/blog/practical-bm25-part-2-the-bm25-algorithm-and-its-variables"]
---

这组官方资料解释词项评分、语义表示、候选模型重排与多路 RRF 融合。它们处理不同问题，可以组合。本文节选原理，不固定具体模型或服务默认值；未运行示例。

## 召回分数依据什么？

Elastic 的 BM25 文章把评分拆为词项区分度、词频与长度归一化：很常见的词区分能力较低，同一个词重复出现的增益逐渐饱和，长度因素避免长文仅因词多而占优。k1 影响词频饱和，b 控制长度归一化强度；参数不能脱离语料与分析器来解释。

Sentence Transformers 的语义检索文档区分对称任务与非对称任务。短问题查长段落属于后者，模型选择需匹配任务；`encode_query` 与 `encode_document` 可使用模型配置的不同提示或路由。因此查询与文档需要兼容表示，而不是强制把任意模型都用完全相同字符串方式调用。

## 为什么分成召回与重排？

Sentence Transformers 的 bi-encoder 分别编码问题和文档，**「文档表示可离线计算」**，适合大范围搜索。cross-encoder 同时读取一对问题与候选，能在二者之间做 attention，但需要逐对计算，因此通常只处理较小候选集。官方也展示了小文档直接对所有段落重排的例子，说明两阶段并非硬性要求。

重排器给出的相关性分数依赖模型和输出处理方式，**「不应一概当作正确概率」**。它改善已有候选的顺序，不能补回候选集之外的证据。

## 多路分数为什么需要融合？

Azure 指出 BM25、向量与语义重排的分数范围不同。RRF 对文档在各路的排名求 `1 / (c + rank)` 并累加，未出现的路不贡献分数；这样不用直接比较原始分值。这里用 c 区分平滑常数与返回条数 K。

同一文档在多路靠前会获得更多贡献，但 **「RRF 不检查文本内容，也不证明真实性」**。Azure 的 semantic ranker 在 RRF 后运行，并单独返回重排分。由此可把排障分成：各路是否找到、融合是否留下、重排是否选对。
