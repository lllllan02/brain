---
parent: agent
title: "Agent Trace 要记录什么"
category: "Agent"
updated_at: "2026-10-07"
tags: ["Agent", "Trace", "可观测性", "错例回流", "数据脱敏"]
---

**记录任务输入与必要上下文、模型可见信息、工具调用参数和返回值、最终回复及任务状态，并用同一 Trace ID 串联。** 保留模型、Prompt、工具和数据版本，关联用户反馈；敏感信息脱敏（redaction），缺失或截断内容注明，供失败归因和用例重放使用。
