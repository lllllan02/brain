---
title: "Haystack：用组件连起索引与混合检索"
category: "RAG"
tags: ["RAG"]
type: "article"
parent: "rag-practice"
created_at: "2026-10-13T10:49:42+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: ["https://docs.haystack.deepset.ai/docs/creating-pipelines", "https://haystack.deepset.ai/tutorials/33_hybrid_retrieval"]
---

Haystack 用带类型输入输出的组件组成 Pipeline，适合把 RAG 各阶段拆开运行和检查。本篇节选 Creating Pipelines 与混合检索教程，依据 2026-10-13 文档；示例依赖与 API 随版本变化，未在本地运行。

## 数据怎样流过组件？

组件用 `add_component` 注册，用 `connect` 连接输出与下游输入，最后由 `run` 提交未由连线提供的输入。例如 text embedder 的 embedding 输出连到 retriever 的 query_embedding，再将文档交给 prompt builder，生成的请求交给模型组件。

**「索引流程负责清洗、切分、文档编码与写入」**；**「查询流程复用这些文档表示，只对当前问题编码」**。这样无需每次问答重建索引，也可分别检查入库与查询问题。

## 混合检索增加了什么？

2026-06-17 更新的官方混合检索教程，把 BM25 与 embedding retriever 都直接连接到同一个 ranker 输入，再由交叉编码器排序。它没有显式使用 DocumentJoiner 或 RRF；不能因为称为“混合检索”就推定用了某种排名融合算法。

调用 `run` 时，查询分别传给 text_embedder 的 text、bm25_retriever 的 query 和 ranker 的 query。端口连线负责文档与向量传递，不会替代这些外部输入。

组件边界使逐步替换与观察中间输出更直接，但**「框架不自动决定语料切分、权限策略和评测标准」**。教程使用内存存储、英文 PubMed 语料和指定模型，展示代码还指定 CUDA 设备；在本机或中文语料使用时需调整环境与模型。服务化还需持久化后端并管理更新与失败。
