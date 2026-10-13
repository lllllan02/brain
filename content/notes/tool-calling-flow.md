---
learning_status: understood
title: "工具调用流程"
parent: tool-calling
category: "Agent"
tags: ["Agent", "工具调用", "API"]
created_at: "2026-10-10"
updated_at: "2026-10-12T11:53:56+08:00"
---

**工具调用是模型提出调用请求、程序执行工具，再把结果交回模型的过程。** 模型负责选择工具和生成输入，程序负责实际执行并组织下一轮模型请求。

![[assets/tool-calling-flow.png|工具的定义与执行实现：取出定义交给模型，再按返回的名称查找工具并传入参数执行]]

1. 提供工具定义：程序将工具名称、用途和参数结构，与任务上下文一起发送给模型。其中 `parameters` 约定输入的格式，工具实现保留在执行端。
2. 提出调用请求：模型根据任务选择工具，返回 `name` 和本次实际输入的 `arguments`。接口返回的调用 ID 用于将后续结果关联到本次请求；此时工具尚未执行。
3. 执行工具：程序按 `name` 查找对应工具，再将 `arguments` 传给它的执行实现，取得结果。图中的 `tools[name]` 表示按名称查找的映射，`execute` 表示工具的执行入口。
4. 回传结果：程序将工具结果与调用 ID 对应起来，按接口要求保留调用记录与上下文，再次请求模型。模型由此知道自己提出的操作得到了什么结果。
5. 继续或结束：模型根据结果生成最终回答，或者提出新的调用请求。新请求回到程序执行环节，重复「执行 → 回传 → 再决策」；无需工具时，模型也可以在第一次请求中直接回答。

完成「提出一次调用，再根据结果回答」通常需要两次模型请求，中间由程序执行工具。[OpenAI 的 Function calling 文档](https://developers.openai.com/api/docs/guides/function-calling)描述了这条交互链；具体消息字段由[[tool-calling-chat-completions|Chat Completions 最小消息示例]]展示，程序如何组织循环由[[tool-calling-go|Go 最小实现]]展示。
