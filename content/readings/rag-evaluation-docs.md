---
title: "Ragas 与 LangSmith：评测对象、参照物和自动裁判"
category: "RAG"
tags: ["RAG"]
type: "article"
parent: "rag-quality-evaluation"
created_at: "2026-10-13T10:49:42+08:00"
updated_at: "2026-10-13T10:49:42+08:00"
source: ["https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/faithfulness/", "https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/context_recall/", "https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/answer_relevance/", "https://docs.langchain.com/langsmith/evaluate-rag-tutorial", "https://ir-measur.es/en/latest/measures.html"]
---

这组导读节选 Ragas 的三个指标、LangSmith 的 RAG 评测教程与 ir-measures 的检索指标定义。依据 2026-10-13 阅读页面；关注评分含义，未调用模型裁判。

## 同一个答案为什么会得到不同评分？

Ragas Faithfulness 先把回答拆成声明，再判断每项能否由上下文支持，计算支持声明的比例。它衡量证据一致性；如果上下文本身错误，忠实也可能答错。

LLM Context Recall 从「参考答案」拆出声明，检查上下文能支持多少。分母是参考声明，与按相关文档数量定义的 Recall@K 不同；不完整的参考答案会限制评分范围。

Answer Relevancy 从生成回答反推若干问题，再用 embedding 比较它们与原问题的接近程度。它是切题程度的代理量，不评价事实正确性；原文还提醒余弦相似度并非数学上必然非负。

## 怎样让评测可复查？

LangSmith 教程把正确性、回答相关性、依据一致性与检索相关性分开，给评分器不同的参照物：问题、参考答案、实际回答或取回文档。评测运行保留样本与输出，便于定位差异。

ir-measures 的 P、Recall、RR、nDCG 面向已标注的检索结果：分别检查前列的相关比例、找回比例、首个相关排名与折损增益。应明确截断位置、相关性阈值、增益函数和未标注项处理，不能只报一个指标名称。

工程上应冻结数据集、索引版本与裁判配置，并用人工核对自动评分分歧；这是将上述评分机制用于回归的做法。自动裁判提供可扩展信号，不能取代业务事实与权限检查。
