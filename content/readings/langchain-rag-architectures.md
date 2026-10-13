---
title: "LangChain：固定流程、Agentic 与混合 RAG"
category: "RAG"
tags: ["RAG"]
type: "article"
parent: "rag-architecture"
created_at: "2026-10-13T10:49:42+08:00"
updated_at: "2026-10-13T10:49:42+08:00"
source: ["https://docs.langchain.com/oss/python/deepagents/retrieval"]
---

官方 Retrieval 文档把知识库建设与查询编排分开。这里整理架构分类和组件接口；依据 2026-10-13 读取的滚动文档，原链接当日跳转到 Deep Agents 的 Retrieval 页面，未运行示例。

## 已有数据源是否必须重建？

文档允许直接查询 SQL、CRM 或已有文档系统，再把返回内容交给模型；自建向量库只是选择之一。自建时，loader 统一文档格式，splitter 切分，embedding 编码，vector store 存取向量，retriever 接收查询并返回文档。

## 谁决定检索流程？

2-Step RAG 由应用安排先检索后生成，调用次数较容易控制。Agentic RAG 把检索暴露为工具，由模型决定何时、如何调用；其必要条件是可访问检索工具，不要求多个 Agent。

Hybrid RAG 在两者之间加入查询增强、证据检查、再次检索或答案检查。这里的 hybrid 指「流程编排」，与关键词加向量的 hybrid search 不是同一维度。程序预设循环也能重试和纠错，不能据此判定已经采用 Agentic 架构。

文档强调可预测延迟依赖检索服务与模型的实际耗时。教程展示的是框架用法，不能代替业务权限、超时和效果验证。
