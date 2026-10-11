---
title: "Chat Completions 工具调用的最小消息示例"
aliases: ["Chat Completions 工具调用示例"]
parent: tool-calling-flow
category: "Agent"
tags: ["工具调用", "API"]
created_at: "2026-10-11T10:23:37+08:00"
updated_at: "2026-10-11T10:23:37+08:00"
---

**一次工具调用通常跨越两次模型请求：第一次让模型提出调用，程序执行后，第二次把结果交回模型。**

以下为非流式、单次函数调用示例，天气数据是假设值，未实际执行；兼容服务需支持这些字段。

## 第一次请求：声明工具

向 `/v1/chat/completions` 发送：

```json
{
  "model": "gpt-4.1",
  "messages": [{"role": "user", "content": "查询北京天气"}],
  "tools": [{
    "type": "function",
    "function": {
      "name": "get_weather",
      "description": "查询城市天气",
      "parameters": {
        "type": "object",
        "properties": {"city": {"type": "string"}},
        "required": ["city"]
      }
    }
  }]
}
```

## 模型响应：请求调用

取响应的 `choices[0].message`，示例为：

```json
{
  "role": "assistant",
  "content": null,
  "tool_calls": [{
    "id": "call_123",
    "type": "function",
    "function": {
      "name": "get_weather",
      "arguments": "{\"city\":\"北京\"}"
    }
  }]
}
```

`arguments` 是 JSON 字符串，程序解析、校验参数并检查权限后执行 `get_weather`。收到调用请求时，工具尚未执行。

## 第二次请求：回传结果

保留原用户消息和上述完整 Assistant 消息，再追加：

```json
{
  "role": "tool",
  "tool_call_id": "call_123",
  "content": "{\"temperature\":25,\"weather\":\"晴\"}"
}
```

将更新后的 `messages`、原 `model` 和 `tools` 再次发送给同一接口。`tool_call_id` 对应请求的 `id`，`content` 是序列化的结果字符串。模型随后可以作答，也可以继续调用工具；一轮有多个调用时，需分别回传各自结果。

这是一轮工具调用中的两次模型请求，中间由程序执行工具。字段与交互参考 [OpenAI Function calling](https://developers.openai.com/api/docs/guides/function-calling)。
