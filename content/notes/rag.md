---
title: "RAG（检索增强生成）"
category: "RAG"
updated_at: "2026-10-08"
tags: ["RAG", "检索增强生成", "召回", "重排", "上下文构建", "答案生成"]
aliases: ["RAG", "检索增强生成", "Retrieval-Augmented Generation"]
---

**RAG（检索增强生成，Retrieval-Augmented Generation）是在回答问题前先检索外部材料，再把材料交给模型作为回答依据**——让模型基于可更新、可追溯的资料作答，而不是只靠训练时的记忆。这些材料可以来自知识库或其他可检索的数据源。

一次常见的问答流程是：

1. **[[rag-retrieval|召回]]**：根据问题检索可能有用的文档片段，得到候选材料。
2. **[[rag-reranking|重排]]**：对候选材料重新评分排序，优先选取更有助于回答的片段；这是可选的优化环节。
3. **[[rag-context-construction|构建上下文]]**：把选中的正文和来源组织进模型输入。
4. **[[rag-answer-generation|生成回答]]**：模型根据问题和证据组织答案，必要时附上引用或说明信息不足。
