---
title: "MCP（模型上下文协议）"
aliases: ["MCP", "Model Context Protocol", "模型上下文协议"]
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-09"
updated_at: "2026-10-09"
---

**MCP（Model Context Protocol，模型上下文协议）是 AI 应用连接外部能力的标准协议，统一工具、数据资源和提示模板的发现与通信方式。** 提供方按协议暴露能力，AI 应用通过对应 Client 接入，减少每种集成都自行设计通信接口的工作。

## 三类核心能力

- Tools（工具）：执行动作，例如查询数据库、调用 API、修改文件。
- Resources（资源）：提供可读取的上下文数据，例如文件内容、数据库结构；由应用决定如何交给模型使用。
- Prompts（提示模板）：提供可复用的交互模板，例如代码评审或报告生成提示，可接收参数并返回消息内容。

三者分别提供「可执行的动作」「可读取的数据」「可复用的交互方式」，不是必须依次经过的步骤，Server 也不必全部提供。

## 谁与谁通信

- Host：承载 AI 功能的应用，管理模型交互、访问权限和多个 Client。
- Client：由 Host 管理，与对应 Server 通信，获取定义、发送请求并接收结果。
- Server：提供工具、资源或提示模板，可以是本地进程，也可以是远程服务。

MCP 使用 JSON-RPC 表达协议消息，可通过本地 stdio 或远程 Streamable HTTP 通信。它不规定应用如何调用模型、组织上下文或实现内部注册表；MCP 也不等于 Agent 或动态注册机制。角色、能力与协议范围参考 [官方架构说明](https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture)。

从连接、发现到使用和更新的过程，在 [[mcp-flow|MCP 的完整交互流程]] 中展开。
