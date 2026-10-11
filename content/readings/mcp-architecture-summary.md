---
title: "MCP 官方架构：发现、调用与通知"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-11T00:40:07+08:00"
updated_at: "2026-10-11T00:40:07+08:00"
source:
  - "https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture"
---

**MCP 将消息语义与传输方式分开：数据层规定交互内容，传输层负责递送消息。** 本文依据官方架构 `2026-07-28` 版本，示例未经本地运行。

Host 管理模型及多个 Client，每个 Client 对接一个 Server。stdio 用于本地进程通信；Streamable HTTP 使用 HTTP POST，并可通过 SSE 流式传递消息。

## 一次工具交互

以官方天气工具为例：

1. Client 可用 `server/discover` 获取服务支持的版本与能力。服务端必须实现它，客户端不必每次先调用。
2. `tools/list` 返回工具名、描述和 `inputSchema`；Host 据此向模型提供定义。
3. 模型提出查询后，Host 经 Client 发送 `tools/call`，携带工具名和城市参数。
4. Server 返回内容，Host 再交给模型。JSON-RPC 的 `id` 关联请求与响应。

每个请求的 `_meta` 都携带协议版本与客户端能力，通常还包含客户端身份；发现结果不能替代这些请求字段。此流程不能直接套用旧版初始化时序。

## 工具变化如何被发现

客户端通过 `subscriptions/listen` 订阅工具列表变化；服务端支持并确认后，发送变化通知，客户端再刷新列表。通知本身不要求响应，也不直接携带完整的新工具定义。

原文定位：[分层](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture#layers)、[交互示例](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture#example)。工具字段与失败表达见[[mcp-tools-summary|Tools 规范]]。
