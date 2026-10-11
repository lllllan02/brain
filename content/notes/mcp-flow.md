---
title: "MCP 的完整交互流程"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-09"
updated_at: "2026-10-11T10:39:12+08:00"
---

**MCP 的交互主线是：建立连接 → 发现能力 → 发起调用或读取 → 接收结果 → 按需继续或结束。** 宿主应用（Host）组织模型与上下文，客户端（Client）负责和服务端（Server）通信；模型不会自行连接 Server。

## 一次工具调用

以用户要求「查询订单 A001」为例：

1. 建立连接：Host 创建 Client，连接本地或远程 Server，按需完成授权，并确认协议版本与双方能力。
2. 发现工具：Client 用 `tools/list` 获取定义，分页时继续获取。Host 筛选工具，记录工具名到 Server、Client 的映射。
3. 请求模型：Host 将工具定义适配到模型接口，与用户问题一起发送。模型提出调用 `query_order`，参数为 `order_id=A001`；此时工具还未执行。
4. 派发执行：Host 校验参数与权限，通过对应 Client 发送 `tools/call`，Server 调用实际业务逻辑。
5. 返回结果：Server 将订单状态返回 Client，Host 将结果关联到原工具调用并交回模型。模型据此回答，或提出下一次调用，由 Host 继续组织。
6. 维护与结束：连接可供后续请求复用；工具发生变化时，Host 按支持的通知机制刷新定义与映射。不再使用时关闭连接，并按应用管理方式清理本地进程。

MCP 消息使用 [[json-rpc|JSON-RPC]]，本地常用 [[stdio|stdio]]，远程可用 Streamable HTTP；SDK 通常处理协议细节。具体初始化与通知方式随版本变化，见[官方架构](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)与[旧版生命周期](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)。

## 资源和提示模板在哪里使用

Client 分别用 `resources/list`、`prompts/list` 发现，再用 `resources/read`、`prompts/get` 获取内容。Host 可在请求模型前，将所需资料与提示消息加入上下文；它们不必经过 `tools/call`，也不是每次工具调用的必经步骤。

## 实现对照

- [[mcp-tool-calling-go|MCP 工具调用的 Go 最小实现]]

排障先区分连接失败、工具不可见和执行失败；写操作超时后不能据此认定未执行。版本兼容需核对宿主、SDK 与协议；补充输入、进度、取消等能力按双方支持使用。连接恢复和版本对比仍待展开。
