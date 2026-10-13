---
title: "MCP Tools：定义、结果与错误"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-11T00:40:07+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://modelcontextprotocol.io/specification/2026-07-28/server/tools"
---

**「MCP Tools 规范约定工具如何被发现和调用，以及结果、补充输入和失败如何表达。」** 本文依据 `2026-07-28` 版本，未运行示例。

## 定义与调用

[交互定位](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#user-interaction-model)称工具为「模型控制」：通常由模型根据上下文选择工具，客户端发出协议请求，服务端执行。协议允许其他调用入口，应用仍应让用户知晓并能拒绝调用。工具既可查询数据，也可产生修改；模型选择不替代授权。

服务端声明 `tools` 能力，`tools/list` 返回工具定义并支持分页。`name` 在单个服务内唯一；`inputSchema` 描述参数，`outputSchema` 可选。`tools/call` 用工具名和 `arguments` 发起执行。

工具集合可以随请求授权变化，但不能依赖隐式连接状态或该连接上先前请求的副作用。[能力约束](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#capabilities)

## 名称冲突与集合变化

**「名称唯一性限于单个 Server」**。汇集多个服务时，客户端应自行消歧，例如使用来源前缀；`serverInfo.name` 本身不保证跨服务唯一，不能直接假定它就是唯一前缀。调用时仍需定位目标 Server 和其原工具名。[名称约定](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#tool-names)

本版本中，声明 `listChanged` 的服务向已通过 `subscriptions/listen` 订阅 `toolsListChanged` 的客户端发送工具列表变更通知。客户端据此重新获取列表，并维护本地定义和调用映射；通知本身不包含完整的新目录。[变更通知](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#list-changed-notification)

## 结果与失败

- `content` 可包含文本、图片、音频或资源；`structuredContent` 提供 JSON 数据，有 `outputSchema` 时必须符合它。
- `input_required` 表示还需补充输入；客户端带上输入回应及服务端提供的状态继续请求，并使用新的请求 ID。
- 未知工具、请求结构错误等使用 JSON-RPC `error`；业务失败、参数值不合要求等使用工具结果中的 `isError: true`。

例如，工具名不存在与「出发日期已过期」属于不同失败。后者应给模型可用于调整参数的反馈。[错误处理](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#error-handling)

## 跨调用状态

原文建议购物车等**「状态用显式句柄关联」**：创建后返回 `basket_id`，后续调用携带它。已认证服务仍应逐次检查调用者对该对象的权限，不能把知道句柄当成获准访问。[状态工具](https://modelcontextprotocol.io/specification/2026-07-28/server/tools#stateful-tools)
