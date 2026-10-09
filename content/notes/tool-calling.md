---
title: "工具调用（Tool Calling）"
aliases: ["Tool Calling", "Function Calling", "函数调用"]
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**工具调用是模型生成工具名称与参数，由外部程序执行工具，再将结果交回模型的交互机制。** 模型发出调用请求，实际执行由程序负责。

1. 提供工具定义：程序向模型传入工具名称、用途和参数结构（Schema）。
2. 生成调用请求：模型根据问题决定是否调用工具，需要时返回工具名称、参数和调用标识。
3. 执行工具：程序解析并校验参数、检查权限，执行对应函数。
4. 回传结果：将调用请求与执行结果加入上下文，关联对应调用标识，再次调用模型。
5. 继续决策：模型根据结果生成答案，或请求下一次工具调用。

工具调用本身不等于 Agent；它也可以用于固定流程。[[agent-loop|Agent Loop]] 将这种交互放入可持续决策的循环中。

生产实践还需按问题补充[[tool-calling-harness|工具调用的 Harness 能力]]，覆盖注册与发现、执行约束、失败恢复和结果处理。

具体传输格式见 [[chat-completions-tool-calling|Chat Completions 工具调用示例]]。流程参考 [OpenAI Function calling](https://developers.openai.com/api/docs/guides/function-calling)。
