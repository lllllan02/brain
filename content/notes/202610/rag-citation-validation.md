---
title: "RAG 如何检查答案中的引用真的支持结论？"
updated_at: "2026-10-05"
tags: ["Agent"]
classes: ["concept"]
---

后端先检查证据编号属于本次允许使用的材料、摘录确实来自原文，再用规则或校验模型逐条核对结论是否被支持，尤其是数字、适用条件和矛盾。失败时删除无依据结论、有限次重写或拒答；引用链接由后端生成。

> 真实引用也可能支持不了结论，例如「支持退款」不能证明「三天到账」。校验模型也会误判，需要评测。

参考：[Claude 官方文档：降低幻觉](https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations)。