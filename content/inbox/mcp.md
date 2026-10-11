---
title: "MCP（模型上下文协议）"
parent: tool-calling
aliases: ["MCP", "Model Context Protocol", "模型上下文协议"]
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-09"
updated_at: "2026-10-11T10:09:20+08:00"
---

**MCP（Model Context Protocol，模型上下文协议）是 AI 应用与外部服务之间的开放通信协议，约定工具、资源和提示模板如何被发现与使用。**

AI 应用要查询订单、读取文件或访问数据库，仍需接入实际系统。各系统的 API、参数和返回格式不同，应用往往要分别编写适配代码；换一个 AI 应用，同一套接入又可能重做。**「每个应用分别适配每个服务」带来的重复开发与维护，是 MCP 要缓解的痛点。**

MCP 将接入方式统一：服务方通过 Server 暴露能力，宿主应用（Host）通过 Client 按相同约定发现、调用或读取。这样，同一个 Server 可以被多个兼容应用复用，底层业务接口的适配集中在服务端。本地通常使用 stdio，远程可使用 Streamable HTTP。

MCP 统一的是接入约定，具体业务与权限检查仍需实现；模型决策、上下文组织和 Agent 循环仍由宿主负责。Function Calling 让模型提出工具调用，可与 MCP 配合。只有少量固定调用时，直接使用函数或 API 也可以。

## 能力与使用

- [[mcp-capabilities|Tool、Resource 与 Prompt 的区别]]
- [[mcp-flow|从发现到调用的完整流程]]
- stdio 最小实现：[[mcp-server|Server]] · [[mcp-client|Client]]
- Streamable HTTP 最小实现：[[mcp-http-server|Server]] · [[mcp-http-client|Client]]
- [[mcp-permissions|接入授权与权限边界]]：stdio、API key、OAuth、凭据管理与下游授权

## 官方资料

- [[mcp-specification-summary|协议约定的范围]] · [[mcp-architecture-summary|架构与消息交互]] · [[mcp-tools-summary|工具参数、结果与错误]]
- [天气工具实现示例](https://modelcontextprotocol.io/docs/2026-07-28/develop/build-server)
