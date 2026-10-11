---
title: "MCP 的 Tool、Resource 与 Prompt 有什么区别"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-11T10:06:16+08:00"
updated_at: "2026-10-11T10:06:16+08:00"
---

**MCP 用 Tool 表达可调用的操作、Resource 表达可读取的数据、Prompt 表达可复用的提示消息。**

服务端按需提供三类能力，不要求全部实现：

- Tools（工具）：通过 `tools/call` 调用操作，如查询订单、修改文件；既可以只读，也可以产生修改。
- Resources（资源）：通过 `resources/read` 按 URI 读取数据，如表结构、文档内容；有独立接口，不必经过 Tool。
- Prompts（提示模板）：通过 `prompts/get` 获取可复用、可带参数的提示消息；可以是固定内容或动态生成，获取模板本身不会调用模型。

**「调用一个操作」与「读取一份资料」是 Tool 和 Resource 的主要区别，不按给人还是给模型使用来划分。** 例如，同一份订单数据既可由 `query_order` 工具返回，也可作为 `orders://A001` 资源直接读取。Tool 常由模型提出调用、应用执行，也可由应用直接调用；Resource 由应用读取后，既能显示给人，也能加入模型上下文，不会因服务端提供了它就自动进入上下文。[Resources 规范](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)

三者可围绕同一任务配合，例如选择「解释订单」提示模板、读取订单资源，再按用户要求调用取消订单工具；这不是必须遵循的流程。具体支持取决于宿主与服务端实现。
