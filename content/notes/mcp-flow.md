---
title: "MCP 的完整交互流程"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-09"
updated_at: "2026-10-10"
---

**[[mcp|MCP]] 的交互主线是：连接 Server → 确认版本与能力 → 发现定义 → 按需使用 → 处理结果。** 工具、资源与提示模板按需求选用，不是依次执行的步骤。

## 从发现到调用

以应用自行接入工具为例：

1. Host 创建 Client，连接本地或远程 Server，按需认证并确认兼容能力。
2. Client 通过 `tools/list` 获取工具定义，分页时继续获取；Host 筛选后可加入[[tool-registry|注册表]]，记录工具名与 Server、执行入口的映射。
3. Host 将选中的定义交给模型。模型提出调用后，Host 校验参数与权限，由 Client 发送 `tools/call`。
4. Server 执行并返回，Host 将结果交回模型，继续[[tool-calling-flow|工具调用流程]]。

资源和提示模板分别通过 `resources/list`、`prompts/list` 发现，再用 `resources/read`、`prompts/get` 获取内容，由 Host 决定如何使用。[官方架构](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)

## 和本地工具调用有什么区别

**通过支持函数工具的 Chat Completions 兼容接口调用模型时，包装后的 MCP 工具与本地工具使用相同的传输格式。** 两者都作为 `type: "function"` 放进 `tools`，提供工具的 `name`、`description`、`parameters`；MCP 的 `inputSchema` 由程序适配为 `parameters`。

模型根据这些定义返回 `tool_calls`，其中仍是具体工具名和参数，不需要知道背后是否使用 MCP。接口不会额外用 MCP Server Name 代替工具定义；如果程序把 Server 名称加入工具名前缀，模型看到的也只是一个带前缀的工具名。

区别在程序侧的发现与执行：本地工具的定义和执行函数由应用提供，MCP 工具的定义从 Server 获取。收到调用后，程序按注册表路由：

- 本地工具：校验后调用对应函数。
- MCP 工具：校验后找到对应 Client，映射回 Server 上的工具名，通过 `tools/call` 执行。

两者的结果都转换为同一模型接口的 Tool 消息，用 `tool_call_id` 关联原调用。MCP 统一的是「应用如何发现和调用外部工具」；模型侧仍沿用普通工具调用。[MCP Client 接入示例](https://modelcontextprotocol.io/docs/2026-07-28/develop/build-client)、[函数工具格式](https://developers.openai.com/api/docs/guides/function-calling)

工具变更时刷新定义与注册表，不再使用时关闭连接，按应用管理方式清理本地进程。初始化与通知方式随版本变化，按实际协议与 SDK 核对：[旧版生命周期](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)、[新版架构](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)。
