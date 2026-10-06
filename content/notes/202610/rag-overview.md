---
title: "RAG：流程、质量评测与证据不足处理"
category: "RAG"
updated_at: "2026-10-05"
tags: ["RAG", "检索增强生成", "评测", "防幻觉"]
classes: ["overview"]
---

**RAG 的核心是检索外部材料，并将其作为模型回答问题的依据**。理解和使用它，可以从三个方面展开：

1. **[[rag-question-answering-flow|基本流程]]**：召回、重排、构建上下文和生成回答分别做什么，怎样衔接。
2. **[[rag-quality-evaluation|质量评测]]**：怎样判断证据找得全、排得好、保留完整，以及答案正确且有依据。
3. **[[rag-insufficient-evidence-handling|证据不足处理]]**：材料为空、无关、不完整或冲突时，怎样补检索、追问或说明无法确认。
