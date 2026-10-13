---
title: "Microsoft GraphRAG：实体、社区与两类查询"
category: "RAG"
tags: ["RAG"]
type: "article"
parent: "rag-graph"
created_at: "2026-10-13T10:49:42+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: ["https://microsoft.github.io/graphrag/index/overview/", "https://microsoft.github.io/graphrag/query/overview/"]
---

Microsoft GraphRAG 把文本转成实体关系与社区报告，**「为局部实体问题和全局综合问题提供不同检索方式」**。本文节选官方索引与查询总览，依据 2026-10-13 文档；未构建图谱或复现实验。

## 索引多做了哪些工作？

标准流程从文本抽取实体、关系等结构，进行社区发现，再生成不同层级的社区摘要与报告，同时建立向量表示。默认结构化结果写为 Parquet，embedding 写入配置的向量存储；使用 GraphRAG 不等于必须另装图数据库。

这里的社区是图中的关联群组，报告是模型对群组的综合。二者提前把跨片段关系组织起来，代价是抽取、摘要、存储与后续维护。

## 查询为何需要分路？

Local Search 联合实体相关结构与原文片段，适合围绕特定对象展开。Global Search 对社区报告做 map-reduce，适合全库主题与整体趋势问题，官方明确其资源开销较高。DRIFT 在局部查询中引入社区信息，再形成细化追问；Basic Search 保留普通向量搜索基线。

“项目 X 有哪些依赖”与“整个资料库反复出现哪些风险”需要的证据范围不同，因此**「不能把所有问题都送去全局搜索」**。抽取结果和社区报告也需要回溯原文；图中的边是模型提取结果，不自动成为可靠事实。这是从数据生成方式推导出的使用边界。
