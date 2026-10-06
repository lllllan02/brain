---
title: "Agent 学习地图"
updated_at: "2026-10-06"
tags: ["Agent"]
classes: ["map"]
---

# Agent 学习地图

从整体解释进入相关问题；以下入口保留旧专题中的有效内容。

## 概念与运行

- [[agent-definition-and-boundaries|Agent 指什么：定义与判断边界]]
- [[agent-vs-workflow|Agent 与固定工作流、聊天机器人的区别]]
- [[agent-execution-loop|Agent 的运行循环：从目标到行动再回到反馈]]
- [[agent-components|Agent 的几类关键组件：模型、工具、记忆、规划]]
- [[agent-framework-selection|Agent 主流框架与工程选型考虑]]
- [[agent-minimal-example|一个最小可运行 Agent 长什么样]]
- [[agent-definition|Agent 是什么？]]
- [[rag-overview|RAG：流程、质量评测与证据不足处理]]

## 证据不足与防幻觉

- [[rag-insufficient-evidence-handling|RAG 检索不到内容时怎么办？如何防止模型硬凑答案、产生幻觉？]]
- [[rag-programmatic-evidence-checks|RAG 程序能判断检索材料是否足以回答吗？]]
- [[rag-retry-clarify-or-abstain|RAG 证据不足时，何时重试、追问或拒答？]]
- [[rag-citation-validation|RAG 如何检查答案中的引用真的支持结论？]]
- [[rag-hallucination-guardrail-evaluation|RAG 如何评测防幻觉策略，避免过度拒答？]]
- [[rag-insufficient-evidence-prompts|RAG 提示词怎么写，才能让模型在无答案时如实说明？]]
- [[rag-backend-answer-validation|RAG 接口和后端怎么实现无依据答案拦截？]]
- [[rag-evidence-completeness|RAG 怎样检查回答所需的信息是否找齐？]]
- [[rag-question-answering-flow|RAG 是什么，一次问答会经过哪些阶段？]]

## RAG 流程与质量

- [[rag-quality-evaluation|如何评估 RAG 的检索与回答质量？]]
- [[rag-retrieval-evaluation|RAG 召回阶段如何评估证据是否找全？]]
- [[rag-context-evaluation|RAG 构建上下文阶段如何评估证据是否保留完整？]]
- [[agent-multi-step-retrieval-evaluation|Agent 多轮检索怎样评估，何时应停止？]]
- [[rag-evaluation-dataset|RAG 检索评测集怎么构建，自动评分如何校准？]]
- [[rag-reranking-evaluation|RAG 重排阶段如何评估证据排序？]]
- [[rag-answer-evaluation|RAG 生成回答阶段如何评估答案质量？]]
- [[rag-recall-and-precision|Recall@K、Precision@K 和 K 分别是什么意思？]]
- [[rag-ndcg|NDCG@K 是什么，怎样判断排序好不好？]]
- [[rag-mrr|MRR 是什么，和 NDCG 有什么区别？]]
- [[rag-evidence-coverage-and-fidelity|RAG 去重、压缩和截断后，怎样检查证据覆盖率与原意？]]
- [[rag-faithfulness-vs-correctness|Faithfulness / Groundedness 是什么，和答案正确性有什么区别？]]
- [[rag-answer-relevancy|RAG 回答相关性是什么，为什么答对事实也可能不切题？]]
- [[rag-retrieval|RAG 召回阶段具体做什么？]]
- [[rag-reranking|RAG 重排阶段具体做什么？]]
- [[rag-context-construction|RAG 构建上下文具体做什么，必须回溯原文吗？]]
- [[rag-answer-generation|RAG 生成回答阶段具体做什么？]]

## 线上错例与评测

- [[agent-failure-feedback-loop|Agent 如何把线上错例回流到评测集？]]
- [[agent-trace-requirements|Agent 线上 Trace 需要记录什么，才能支持错例回流？]]
- [[agent-failure-candidate-selection|Agent 线上 Trace 凭什么进入错例候选池？]]
- [[agent-failure-triage|Agent 如何人工确认错例并定位失败原因？]]
- [[agent-failure-replay-cases|Agent 如何把确认的错例构造成可重放评测用例？]]
- [[agent-evaluation-case-admission|Agent 评测用例满足什么条件才能入库？]]
- [[agent-regression-evaluation|Agent 如何用回流错例做回归验证？]]

- [[agent-evaluation-map|Agent 评测地图]]
