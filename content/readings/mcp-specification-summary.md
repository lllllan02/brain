---
title: "MCP 官方规范：协议约定的范围"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-11T00:40:07+08:00"
updated_at: "2026-10-11T00:40:07+08:00"
source:
  - "https://modelcontextprotocol.io/specification/2026-07-28"
---

**MCP 在 JSON-RPC 消息格式之上，约定外部能力如何声明、请求和返回，使不同应用与服务能够按共同接口交互。** 本文依据官方规范 `2026-07-28` 版本。

## 协议约定什么

JSON-RPC 提供请求与响应的通用形式；MCP 进一步定义能力和交互语义：

- 基础协议：请求自包含，携带版本与客户端能力，使服务端不依赖先前连接状态处理请求。
- 服务端能力：Tools 执行动作，Resources 提供数据，Prompts 提供提示模板。
- 客户端能力：Elicitation（信息征询）让服务端请求用户补充信息。
- 辅助机制：进度、取消和错误报告；Tasks、MCP Apps 等属于可选扩展。

例如，「查询天气」需要共同约定工具怎样列出、参数怎样描述、结果怎样表达；只统一 JSON 消息外形还不够。具体交互见[[mcp-architecture-summary|官方架构中的发现与调用]]。

## 规范与实现的边界

大写的 MUST、SHOULD、MAY 分别表示强制要求、建议和允许的选择，不能把示例做法都当成必需实现。协议提出用户控制、隐私和工具安全原则，实际授权与访问控制仍需应用落实。

原文定位：[基础协议与能力](https://modelcontextprotocol.io/specification/2026-07-28#key-details)、[安全原则](https://modelcontextprotocol.io/specification/2026-07-28#security-and-trust-safety)。
