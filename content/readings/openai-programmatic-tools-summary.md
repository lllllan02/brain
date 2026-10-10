---
title: "OpenAI：用程序编排工具调用"
parent: tool-scheduling
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Programmatic Tool Calling](https://developers.openai.com/api/docs/guides/tools-programmatic-tool-calling)"
---

**可预测的多步调用交给代码编排，中间结果先筛选、聚合，再交给模型。** 本文聚焦 Responses API 的程序化工具调用。

## 调用链怎样变化？

模型生成 JavaScript → OpenAI 托管运行 → 遇到客户端函数时暂停 → 应用执行并回传 → 程序继续，产出 `program_output`。应用执行自有函数，不负责运行生成的 JavaScript。

工具通过 `allowed_callers` 限定直接或程序调用。函数结果需保留 `call_id` 和 `caller`，以恢复对应程序；程序完成后仍需继续到最终模型消息。

## 适合用在哪一段？

原文用并发查询库存和需求、计算缺口展示做法。适合控制流可预测、能压缩中间结果的阶段；逐步语义判断和敏感审批通常保留直接调用。

每次调用仍须检查参数与权限，重试或重放需避免重复副作用。收益应与直接调用比较，同时看答案与证据质量、Token、延迟和恢复表现。

这是[[tool-scheduling|执行调度]]的一种实现参考，不自动解决依赖与资源冲突。原文包含接续循环及 Go 等语言示例；本文按 2026-10-10 文档整理，未运行示例。
