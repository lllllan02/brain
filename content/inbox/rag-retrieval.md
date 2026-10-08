---
title: "RAG 召回（Retrieval）"
category: "RAG"
updated_at: "2026-10-07"
tags: ["RAG", "召回", "文档片段", "知识库"]
aliases: ["召回", "Retrieval", "RAG 检索"]
---

**召回（retrieval）是 RAG 的检索阶段：根据用户问题，从知识库中检索出一批可能提供回答证据的文档片段（chunks）**。输入是问题或由问题生成的搜索词，输出是候选片段列表——**后续[[rag-reranking|重排]]和生成都建立在它之上，召回时没找到的证据，后面补不回来**。

常见方式有三种，通常会组合：

- **关键词检索（keyword retrieval）**：用 [[elasticsearch|倒排索引]] 匹配词项，擅长精确词；
- **向量检索（vector retrieval）**：在向量空间按相似度找候选，擅长语义相近但用词不同；
- **混合检索（hybrid retrieval）**：两者融合，兼顾精确与语义。

无论用哪种，都要做**权限与元数据过滤**，并让返回片段**可追溯到原文**；选存储与索引时按实际查询、更新和过滤需求比较，见 [[database-selection|数据库选型]]。

上面都是「检索一次」的固定流程；问题含糊或需要多跳时，可以改成让模型自己决定检索什么、够不够，见 [[rag-agentic-retrieval|Agentic RAG]]。
