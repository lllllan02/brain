---
title: "OpenAI：函数调用流程"
parent: tool-calling
category: "Agent"
tags: ["Agent", "工具调用"]
read: true
created_at: "2026-10-17T00:32:36+08:00"
updated_at: "2026-10-17T00:32:36+08:00"
source: "https://developers.openai.com/api/docs/guides/function-calling"
---

**函数调用由模型提出请求、应用执行函数，再由模型使用结果继续回答。** 本文依据 2026-10-17 的 OpenAI 指南，节选基本调用流程及 Chat Completions 消息格式；不覆盖流式处理、完整配置和各语言实现。函数定义建议另由[[openai-function-design-summary|函数工具设计导读]]整理。

## 一次调用如何完成？

原文的[五步流程](https://developers.openai.com/api/docs/guides/function-calling#the-tool-calling-flow)依次是：应用提供工具定义，模型返回调用请求，应用执行函数，应用携带结果再次请求模型，模型回答或继续提出调用。因此，单次调用后回答的路径包含两次模型请求；连续调用会继续这一过程。

官方示例用 `get_horoscope` 演示：模型提供星座参数，应用调用本地函数取得结果，再交回模型。函数逻辑由应用运行，提供工具定义本身不会执行函数。

## Chat Completions 怎样对应请求与结果？

应用保留 `choices[0].message` 的完整调用消息，遍历其中的 `tool_calls`。每项的 `function.name` 指定函数，`function.arguments` 是需要解析的 JSON 字符串。

执行后，为每项调用追加 `role: "tool"` 的消息：`tool_call_id` 填对应调用的 `id`，`content` 放结果字符串；对象结果可先序列化为 JSON。随后携带这些消息再次请求模型，使它能把结果与原调用对应起来。

以上是 Chat Completions 格式。Responses 使用 `function_call` 与 `function_call_output`，通过 `call_id` 关联，不能直接混用两套消息字段。本文仅核对文档，未执行 API 联调。
