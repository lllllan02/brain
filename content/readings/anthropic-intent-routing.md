---
title: "Anthropic：用分类提示与结构化输出处理用户请求"
category: "Agent"
tags: ["Agent", "意图识别", "工具调用"]
created_at: "2026-10-13T17:38:39+08:00"
updated_at: "2026-10-14T13:59:35+08:00"
source:
  - "[Ticket routing](https://platform.claude.com/docs/en/about-claude/use-case-guides/ticket-routing)"
  - "[Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)"
  - "[Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)"
read: false
---

**Anthropic 的分类方案由三部分配合：提示说明任务含义，结构约束规定返回格式，应用根据结果选择并执行业务。** 模型生成一个合法对象，只完成了其中一部分。

本篇节选分类、结构化输出与工具调用官方文档，依据 2026-10-13 页面；未发起真实模型请求，不覆盖完整模型选型。

## 分类提示包含什么？

整体过程是：明确类别 → 提供工单和示例 → 模型返回标签 → 程序分派流程。[Ticket routing](https://platform.claude.com/docs/en/about-claude/use-case-guides/ticket-routing) 将角色、允许类别、工单正文、输出格式和输入输出示例一起交给模型。

原例区分订单追踪、退款等任务，只选一个主要意图，不能直接用来保留全部目标。类别定义需有可检验的边界；间接表达或情绪造成误判时，可将错误补成边界示例。

用带正确标签的测试集同时检查准确率、成本和延迟。类别多时可分层分类或检索相关示例，分层会增加调用；原文示例数值不能当作本业务效果。紧急程度、客户类型、语言和服务时限仍可能影响最终分派。

## 输出怎样变得可解析？

JSON Schema 是对字段、类型与允许值的约定。[Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs) 接收这份约定，并约束生成的结构；JSON 输出约束响应字段，严格工具调用约束工具名称与参数。只在提示中写「返回 JSON」没有同等保证。

应用仍需检查拒绝、输出截断和解析失败，HTTP 成功不等于业务对象完整。Schema 能限制订单号是字符串，却不能证明它属于当前用户或允许退款；这些语义与权限问题依赖业务校验和样本评测。

## 工具选择怎样连接执行？

[Tool use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) 区分模型提出的调用与实际执行：客户端工具由应用执行，服务端工具由 Anthropic 执行。自有订单业务通常属于前者，应用必须提供处理入口。

因此，分类标签或工具参数只决定请求进入哪条处理路径，不能代替真实业务查询与执行条件。

## SDK 怎样提交结构约束？

2026-10-13 核对的 Python SDK 用法是：将 Pydantic 数据类型传给 `client.messages.parse()` 的 `output_format`，SDK 转成服务端结构约束，并将返回值解析到 `parsed_output`。也可通过 `messages.create()` 的 `output_config.format` 直接提交 JSON Schema。

SDK 会转换部分服务端不支持的限制，并按原始类型在客户端校验。调用后仍需检查结束原因和解析结果；模型必须支持该功能且账号有权限，模型名称和 SDK 版本应由应用配置固定。
