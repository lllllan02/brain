---
title: "工具执行调度：参考资料入口"
parent: tool-calling
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**这组资料分别回答：谁表达工具调用的依赖、谁推进执行，以及失败后如何控制重试。** 它们处于不同层次，可以组合借鉴，不是一套统一实现。

## 依赖怎样表达

- [[llmcompiler-summary|LLMCompiler]]：模型生成依赖计划，程序调度就绪任务，并支持流式规划与动态重规划。
- [[gemini-tool-scheduler-summary|Gemini CLI PR]]：模型通过等待参数表达顺序，由运行时划分并行批次与屏障。

前者显式组织任务依赖，后者在调用参数中表达等待关系，可先比较“模型决定什么、程序保证什么”。

## 多步流程怎样编排

- [[anthropic-advanced-tool-use-summary|Anthropic Advanced Tool Use]]：代码组织调用并筛选中间结果，同时区分工具搜索与使用示例的作用。
- [[cloudflare-code-mode-summary|Cloudflare Code Mode]]：把工具暴露为带类型的方法，交给代码表达循环、分支和依赖。

## 执行失败怎样处理

- [[pydantic-tool-execution-summary|Pydantic AI]]：并发与顺序屏障、模型修正与失败反馈，以及超时和取消的限制。
- [[aws-retries-summary|AWS 调用容错]]：重试为何会放大负载，退避、抖动与幂等怎样配合。

可按“依赖 → 编排 → 失败边界”阅读；评估方案时，也需区分模型往返开销与外部调用本身的开销。
