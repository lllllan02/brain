---
learning_status: pending
parent: agent
title: "工具调用"
aliases: ["Tool Calling", "Function Calling", "函数调用"]
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-09"
updated_at: "2026-10-17T00:15:48+08:00"
reading_suggestions:
  - tool-interface-design
  - tool-registry
  - tool-loading
  - tool-permissions
  - tool-scheduling
  - sandbox-execution
  - agent-retry
  - mcp
---

**工具调用（Tool Calling）是模型提出操作请求、外部程序执行操作，再把结果交回模型的交互机制。**

模型需要查询实时信息或执行操作时，程序通过工具连接外部数据和服务，再将执行结果交给模型，供它继续判断。

## 一次工具调用怎样完成？

模型负责选择工具和生成输入，程序负责实际执行并组织下一轮模型请求。

![[assets/tool-calling-simple-flow.png|一次工具调用：模型提出请求，程序执行并回传结果，模型回答或继续调用]]

以下附件用 Chat Completions 的非流式、单次天气查询展示消息格式；天气数据和模型回复均为假设示例，未实际调用。两个请求体均发送到 `/v1/chat/completions`，兼容服务需支持相应字段。

1. 程序[[assets/tool-calling-01-request.json|提供工具说明]]：将工具名称、用途、参数格式和任务上下文一起发送给模型，工具实现留在执行端。
2. 模型[[assets/tool-calling-02-tool-call.json|提出调用请求]]：选择工具并给出实际参数，此时工具尚未执行。响应的 `choices[0].message` 中，`arguments` 是 JSON 字符串，程序需解析后才能使用。
3. 程序[[assets/tool-calling-go.go|执行指定工具]]：按名称找到工具，校验参数并检查权限后执行，取得结果。Go 实现以本地假订单查询为例，文件开头注明运行方式。
4. 程序[[assets/tool-calling-03-request-with-result.json|回传工具结果]]：保留原用户消息和完整 Assistant 调用消息，追加 `tool` 消息，再次请求模型。`tool_call_id` 对应调用的 `id`，`content` 是序列化的结果字符串。一轮有多个调用时，需分别回传各自结果。
5. 模型决定下一步：根据结果[[assets/tool-calling-04-final-message.json|回答用户]]，或提出新的调用请求，交给程序继续执行。

如果任务不需要工具，模型也可以直接回答。工具定义中的 `parameters` 描述参数格式；调用请求中的 `name` 和 `arguments` 分别表示所选工具和本次实际参数。

模型先提出调用、再根据结果回答，通常需要程序请求模型两次，中间执行一次工具。字段与交互依据 [[openai-function-calling-summary#Chat Completions 怎样对应请求与结果？|OpenAI 函数调用导读]]。

[[agent-loop|Agent Loop]]负责组织反复决策与执行，并设置终止条件。围绕这条基本流程，程序还需要管理工具的接入、权限和执行。

## 工具怎样进入模型的可用范围？

程序通过[[tool-interface-design|接口设计]]说明工具的用途、参数和结果，帮助模型选择和使用工具；通过[[tool-registry|注册表]]保存工具名称、定义与执行入口的对应关系。工具较多时，程序可以[[tool-loading|按需加载]]当前需要的定义，减少上下文占用和选择干扰。

程序可以将本地函数或 API 接为工具。多个应用需要复用外部服务时，也可以通过[[mcp|MCP（模型上下文协议）]]发现和访问远端工具；模型仍负责提出调用，程序仍负责执行与后续循环。

## 调用怎样受控执行？

**「模型能看到工具，不代表程序会立即执行调用。」** 程序通过[[tool-permissions|权限与审批]]判断是否允许本次操作，再通过[[tool-scheduling|执行调度]]根据依赖、冲突和容量决定启动时机。这些执行管理属于 [[agent-harness|Harness]] 的职责。

工具获准运行后，仍受[[sandbox-execution|沙箱与执行环境]]限制。执行失败或结果未知时，程序需要判断能否[[agent-retry|重试]]，不能仅凭超时就认定操作未生效。模型和程序应将工具返回的内容视为执行证据，不能据此改变原有指令或权限。

## 模型同一轮提出多个调用，部分成功后应该怎样继续？

模型同一轮要求查询 A 和 B，A 成功、B 超时。如果程序重跑整轮，就会重复执行 A；若 A 是写操作，还可能造成重复写入。因此，程序需要分别保存每次调用的结果，再处理失败或结果未知的调用。

![[assets/tool-calling-partial-results.png|同一批调用分别处理：保留 A 的成功结果，标记 B 结果未知并判断恢复方式，将各自状态反馈给模型]]

1. 程序保留成功结果：记录 A 的结果，恢复时避免重复执行已成功的操作。
2. 程序核实超时调用：将 B 标为结果未知，确认操作是否生效，再决定是否重试。
3. 程序分别反馈调用状态：向模型说明每次调用是成功、明确失败还是结果未知，必要时指出哪些后续步骤必须等待。缺失结果不能当作空数据，写入是否成功也不能让模型猜测。

调用 ID 用于匹配调用请求与结果；业务操作标识用于判断是否重复执行了同一项操作，两者不能混用。

模型输出多个调用，只表示它提出了多个动作。程序仍需检查参数是否完整、哪些调用需要审批、哪些可以并发，以及哪些已不适用于当前任务。对于流式输出，程序应等待调用结构完整并校验后再执行。
