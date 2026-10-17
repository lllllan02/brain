---
learning_status: understood
parent: agent
title: "工具调用"
aliases: ["Tool Calling", "Function Calling", "函数调用"]
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-09"
updated_at: "2026-10-17T15:34:32+08:00"
reading_suggestions:
  - tool-interface-design
  - tool-registry
  - tool-loading
  - tool-permissions
  - tool-approvals
  - tool-scheduling
  - sandbox-execution
  - agent-retry
  - mcp
---

**工具调用（Tool Calling）是模型提出操作请求、外部程序执行操作，再把结果交回模型的交互机制。**

模型无法仅凭文本生成获取实时数据或执行实际操作，需要通过工具访问外部系统。

## 一次工具调用怎样完成？

模型负责选择工具和生成输入，程序负责实际执行并组织下一轮模型请求。程序通过[[tool-interface-design|工具接口设计]]约定名称、用途、参数和结果，让模型知道有哪些工具、何时使用以及怎样传参。

![[assets/tool-calling-simple-flow.png|一次工具调用：模型提出请求，程序执行并回传结果，模型回答或继续调用]]

1. 程序[[assets/tool-calling-01-request.json|提供工具说明]]：将工具名称、用途、参数格式和任务上下文一起发送给模型，工具实现留在执行端。
2. 模型[[assets/tool-calling-02-tool-call.json|提出调用请求]]：选择工具并给出实际参数，此时工具尚未执行。
3. 程序[[assets/tool-calling-go.go|执行指定工具]]：按名称找到工具，校验参数并检查权限后执行，取得结果。
4. 程序[[assets/tool-calling-03-request-with-result.json|回传工具结果]]：将结果与对应的调用请求一起加入上下文，再次请求模型。
5. 模型决定下一步：根据结果[[assets/tool-calling-04-final-message.json|回答用户]]，或提出新的调用请求，交给程序继续执行。

同一轮有多个调用时，程序分别执行，并按调用 ID 回传各自的结果或错误；超时等无法确认是否完成的情况应标为结果未知，供模型继续判断。流式输出应等待调用结构完整并校验后再执行。

如果任务不需要工具，模型也可以直接回答。先提出调用、再根据结果回答的路径，通常需要程序请求模型两次，中间执行一次工具；连续调用则由[[agent-loop|Agent Loop]]组织反复决策与执行，并设置终止条件。

### 请求与结果怎样对应？

![[assets/tool-calling-request-result.png|调用请求的 id 与工具结果的 tool_call_id 对应，下一轮保留原问题和完整调用消息并追加结果]]

程序用相同的调用 ID 匹配请求与结果，并保留完整调用消息。图采用[[openai-function-calling-summary#Chat Completions 怎样对应请求与结果？|Chat Completions 消息格式]]：`arguments` 是待解析的 JSON 字符串，`content` 是结果字符串。

JSON 附件为非流式天气查询的假设示例，未实际调用；Go 附件使用本地假订单，运行条件与验证范围写在文件开头。

## 工具调用背后的 Harness

[[agent-harness|Agent Harness]] 是围绕模型建立的运行系统，负责组织输入、执行动作、回传结果并控制执行边界。上述调用流程也由这层系统承接；随着工具和任务增多，还需要统一管理工具集合、执行条件与恢复策略。

### 工具怎样进入模型的可用范围？

程序可以将本地函数或 API 接为工具，也可以通过[[mcp|MCP（模型上下文协议）]]发现和访问远端工具。接入方式改变工具的来源，模型仍负责提出调用，程序仍负责执行与后续循环。

程序通过[[tool-registry|注册表]]统一保存工具名称、定义与执行入口的对应关系。工具较多时，程序可以[[tool-loading|按需加载]]当前需要的定义，减少上下文占用和选择干扰。

### 调用怎样受控执行？

**「模型能看到工具，不代表程序会立即执行调用。」** 模型输出一个或多个请求后，程序仍需检查参数是否完整、哪些操作已不适用于当前任务，以及哪些调用需要审批或可以并发。

程序通过[[tool-permissions|权限规则]]判断本次操作的授权范围；需要额外确认时，由[[tool-approvals|审批]]取得明确范围的决定，执行前再复核当前条件。[[tool-scheduling|执行调度]]则根据依赖、冲突和容量决定启动时机。

工具获准运行后，仍受[[sandbox-execution|沙箱与执行环境]]限制。模型和程序应将工具返回的内容视为执行证据，不能据此改变原有指令或权限。

### 失败后怎样决定是否重试？

调用失败或结果未知时，程序需依据错误原因、操作是否可重复及当前任务条件，判断能否[[agent-retry|重试]]。超时不能证明操作未生效；尚未核实结果时，不能直接重复执行可能产生副作用的操作。

恢复时保留已成功的结果，只处理需要恢复的调用，避免重跑整轮。调用 ID 用于匹配请求与结果；避免重复写入需要业务操作标识，不能仅凭调用 ID 不同就认定是不同操作。
