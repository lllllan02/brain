---
title: "MCP Resources 与 Prompts：数据读取与消息模板"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-12T12:27:44+08:00"
updated_at: "2026-10-12T12:27:44+08:00"
source:
  - "https://modelcontextprotocol.io/specification/2026-07-28/server/index"
  - "https://modelcontextprotocol.io/specification/2026-07-28/server/resources"
  - "https://modelcontextprotocol.io/specification/2026-07-28/server/prompts"
---

**Resources 提供可寻址的数据，Prompts 提供可按参数获取的消息模板；宿主决定如何把它们用于模型交互。** 本文节选官方 `2026-07-28` 规范中的交互定位、发现与获取、内容形式及必要边界，未运行示例，不展开缓存、通知和错误码细则。

## 控制指的是谁决定使用

[服务端能力总览](https://modelcontextprotocol.io/specification/2026-07-28/server/index)将 Tool、Resource、Prompt 分别定位为模型控制、应用控制和用户控制。这里描述的是典型选择入口：模型选择操作，应用管理上下文，用户选择模板；具体规范允许实现采用其他交互方式。Tool 的定义与执行结果另见 [[mcp-tools-summary|Tools 导读]]。

## Resource：先标识资料，再读取内容

[Resources 规范](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)用 URI 标识文件、数据库结构或应用数据。服务端声明 `resources` 能力；`resources/list` 返回目录，`resources/read` 按 URI 返回内容。返回项可为文本或二进制，一次读取可包含多个内容项。

资源模板通过 `resources/templates/list` 暴露参数化 URI，例如原文的 `file:///{path}`；填入路径得到具体资源地址后再读取。它生成的是地址，与 Prompt 的消息模板不同。URI 也不必对应真实磁盘文件。

应用可以让用户选择资源，也可按规则或模型选择自动纳入上下文。提供资源不等于已经把内容交给模型。目录发现、内容获取和上下文采用是三个不同动作；读取仍须校验 URI、访问权限与文件路径。

## Prompt：取得消息，再交给模型

[Prompts 规范](https://modelcontextprotocol.io/specification/2026-07-28/server/prompts)要求服务声明 `prompts` 能力。`prompts/list` 返回名称、描述和参数说明；`prompts/get` 携带名称及参数，返回带角色的 `messages`。原文的代码评审例子把传入代码放进请求评审的消息中，返回的是模型输入，并非评审答案。

消息可含文本、图片、音频、资源链接或嵌入资源，因此 Prompt 不限于一段固定文字。「用户控制」指通常由用户决定何时使用，模板内容由服务端提供；协议不强制斜杠命令或菜单界面。

获取模板与执行模型推理分开。宿主取得消息后还需组织模型请求；资源链接只提供地址，嵌入资源则直接携带内容。实现须校验模板输入输出，避免注入或越权访问。
