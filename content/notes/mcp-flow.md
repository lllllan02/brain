---
title: "MCP 的完整交互流程"
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**[[mcp|MCP]] 的交互可概括为：建立通信 → 确认版本与能力 → 发现定义 → 按需使用 → 处理结果。** 列表更新和连接清理属于持续接入的管理过程；工具、资源和提示模板按需求选择，不是固定串行步骤。

## 从接入到使用

1. 建立通信：Host 按配置启动本地 Server 或连接远程服务，创建 Client，并按需完成认证。
2. 确认能力：了解 Server 支持的协议版本及工具、资源、提示模板等能力，只使用双方支持的功能。
3. 发现定义：用 `tools/list`、`resources/list`、`prompts/list` 获取可用项，有分页时继续获取；资源模板还可通过 `resources/templates/list` 发现。
4. 应用接入：Host 按权限与任务选择可用项。工具可包装进内部 [[tool-registry|Registry]]，记录所属 Server 与执行入口，并区分不同 Server 的同名工具；注册不等于立即对模型可见。
5. 使用能力：工具走 `tools/call`，资源走 `resources/read`，提示模板走 `prompts/get`。Server 返回执行结果、资源内容或模板消息，Host 负责后续使用。

以工具为例，后半段的 [[tool-calling|工具调用]] 是：**模型生成调用请求 → Host 校验参数与权限 → Client 发送 `tools/call` → Server 执行并返回 → Host 回传模型 → 模型继续决策或回答。** 模型调用与上下文更新由 Host 组织，不是 MCP Server 自动完成的。

资源和提示模板的内容则由 Host 按需要加入模型输入或展示给用户。[架构与交互示例](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)、[工具规范](https://modelcontextprotocol.io/specification/2026-07-28/server/tools)、[资源规范](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)

## 更新、结束与版本差异

支持变更通知时，Client 收到 `notifications/tools/list_changed` 后重新获取工具列表，Host 同步内部注册表。不再使用时，关闭订阅和通信，释放 Client；本地进程是否退出、远程连接如何清理取决于传输与应用管理方式。

- `2025-11-25`：用 `initialize` 协商版本与能力，完成初始化；Server 声明 `listChanged` 后可发送列表变更通知。[旧版生命周期](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)、[旧版工具规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
- `2026-07-28`：每个请求携带版本与能力元数据，可先用 `server/discover` 发现能力；列表变更通知需通过 `subscriptions/listen` 主动订阅。[新版架构](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)

具体实现应以实际使用的协议与 SDK 版本为准。
