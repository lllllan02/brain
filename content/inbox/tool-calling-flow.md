---
title: "工具调用流程"
aliases: ["Chat Completions 工具调用示例"]
parent: tool-calling
category: "Agent"
tags: ["Agent", "工具调用", "API"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**一次工具调用由模型提出请求、程序校验并执行、结果回传模型三个环节衔接完成。** 程序负责组织后续模型请求，让模型根据工具结果回答或继续调用。

提供工具定义 → 模型提出调用请求 → 程序校验参数与权限并执行 → 回传结果 → 模型继续决策。

## 执行前的检查

程序按工具名称找到执行入口，校验参数、业务条件与权限，必要时请求审批。**模型看得到工具，不代表调用已获授权。** 执行隔离见[[sandbox-execution|权限检查与沙箱执行]]；依赖、并发、限流、超时与取消由[[tool-scheduling|工具执行调度]]处理。

## 结果回传与继续决策

- **对应调用**：按调用 ID 分别回传结果，明确成功、失败或状态未知；超时不代表操作未发生，[[agent-retry|重试]]前需查询状态或依靠幂等机制避免重复副作用。
- **整理内容**：保留模型下一步所需的信息，大结果按需筛选、分页、截断或脱敏，并说明省略情况；外部返回内容应作为数据处理，不能据此绕过既有指令与权限。
- **继续或停止**：把结果加入上下文，让模型回答、继续调用或[[agent-self-correction|纠正行动]]；程序限制调用次数、时间和费用，长任务按需保存[[agent-task-state|状态]]以支持恢复。

全程通过 [[agent-trace-requirements|Trace]] 记录工具选择、参数、耗时、结果和错误，供排查与评测使用。

## Chat Completions 示例

以下为非流式、单次函数调用示例，天气数据是假设值，未实际执行；兼容服务需支持这些字段。

### 第一次请求：声明工具

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

### 模型响应：请求调用

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

### 第二次请求：回传结果

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
