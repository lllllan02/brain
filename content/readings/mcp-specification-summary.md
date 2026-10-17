---
title: "MCP 官方规范：协议约定的范围"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-11T00:40:07+08:00"
updated_at: "2026-10-17T17:15:10+08:00"
read: false
source:
  - "https://modelcontextprotocol.io/specification/2026-07-28"
  - "https://modelcontextprotocol.io/extensions/tasks/overview"
  - "https://modelcontextprotocol.io/extensions/apps/overview"
reading_suggestions:
  - mcp-architecture-summary
---

**「MCP 在 JSON-RPC 消息格式之上，约定外部能力如何声明、请求和返回，使不同应用与服务能够按共同接口交互。」** 本文依据官方规范 `2026-07-28` 版本，并节选 Tasks 与 MCP Apps 扩展的官方概览；扩展页面按 2026-10-17 在线内容核对，未运行示例。

## 协议约定什么

JSON-RPC 提供请求与响应的通用形式；MCP 进一步定义能力和交互语义：

- 基础协议：请求自包含，携带版本与客户端能力，使服务端不依赖先前连接状态处理请求。
- 服务端能力：Tools 执行动作，Resources 提供数据，Prompts 提供提示模板。
- 客户端能力：Elicitation（信息征询）让服务端请求用户补充信息。
- 辅助机制：进度、取消和错误报告；Tasks、MCP Apps 等属于可选扩展。

例如，「查询天气」需要共同约定工具怎样列出、参数怎样描述、结果怎样表达；**「只统一 JSON 消息外形还不够」**。具体交互见[[mcp-architecture-summary|官方架构中的发现与调用]]。

## 规范与实现的边界

大写的 MUST、SHOULD、MAY 分别表示**「强制要求、建议和允许的选择」**，不能把示例做法都当成必需实现。协议提出用户控制、隐私和工具安全原则，实际授权与访问控制仍需应用落实。

原文定位：[基础协议与能力](https://modelcontextprotocol.io/specification/2026-07-28#key-details)、[安全原则](https://modelcontextprotocol.io/specification/2026-07-28#security-and-trust-safety)。

## 可选扩展已经覆盖哪些需求

[Tasks 官方概览](https://modelcontextprotocol.io/extensions/tasks/overview)针对耗时操作，允许服务端先持久创建任务，再返回任务 ID、状态和保存期限，避免长时间占用请求连接。客户端保存 ID 后，可在重连后查询进度与结果；需要补充输入时处理 `input_required`，再提交回答。取消采用协作方式，不能保证工作立即停止。

双方须支持扩展；业务执行、状态保存和故障处理仍需服务端实现，客户端也须保存关联信息。由此需要区分远程操作的接续与宿主完整任务的恢复：拿到任务句柄后，应用仍须决定如何恢复模型上下文及后续决策。

[MCP Apps 官方概览](https://modelcontextprotocol.io/extensions/apps/overview)允许工具声明交互界面资源，由支持的宿主读取并在受控容器中渲染。界面可以展示图表、表单与审核操作，并通过宿主交换工具结果和交互消息，减少对话与独立网页之间的切换。

宿主决定界面可用的能力，扩展不能任意改写宿主页面或取得全部运行控制。是否适用取决于宿主支持与授权，不能从「支持 MCP 工具」推断「支持 MCP Apps」。
