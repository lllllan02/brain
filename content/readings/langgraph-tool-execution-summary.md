---
title: "LangGraph：同轮工具执行与结果回传"
parent: tool-scheduling
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-12T12:34:54+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: "[Workflows and agents：Agents 与 ToolNode](https://docs.langchain.com/oss/python/langgraph/workflows-agents#agents)"
---

**「LangGraph 将模型决策与工具执行分成不同节点，执行结果写回消息状态，再交给模型决定下一步。」** 本文只摘取官方文档的 Agent 循环与 ToolNode 部分。

## 一轮调用怎样推进？

模型节点生成包含工具名称、参数和调用 ID 的请求；条件边检查是否存在工具调用，有则进入执行节点，否则结束。执行节点找到对应工具，以参数调用它，并把结果包装成带 `tool_call_id` 的 `ToolMessage`。图再回到模型节点，让模型使用结果。

文档的 Graph API 手写示例用循环逐个执行工具；Functional API 示例先提交多个执行任务，再收集结果。预置的 `ToolNode` 则封装并行执行、错误处理与状态注入。这几种写法表明：实际执行顺序取决于运行时代码，不能仅从模型返回了多个调用来判断。

## ToolNode 解决到哪一层？

`ToolNode` 接收调用并执行工具；工具还可通过 `ToolRuntime` 获取图状态和运行上下文。手动调用节点时，必须传入工具需要的状态，只传 `messages` 不会自动带上其他字段。

据此可区分两个问题：**「同轮已有调用如何执行」**，以及**「下一轮应该调用什么」**。后者在上述循环中交回模型决定。这个示例没有展示同轮结果占位符解析或文件资源冲突检测，不能据此推定 ToolNode 会自动建立依赖图、保护外部共享资源。

依据 2026-10-12 官方文档，未运行示例。
