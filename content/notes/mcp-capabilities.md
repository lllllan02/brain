---
learning_status: understood
title: "MCP 能力类型"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-11T10:06:16+08:00"
updated_at: "2026-10-12T12:27:44+08:00"
reading_suggestions:
  - mcp-tools-summary
  - mcp-resources-prompts-summary
---

**Tool（工具）提供可调用的操作，Resource（资源）提供可读取的数据，Prompt（提示模板）提供组织模型任务的消息。** 三者区分的是服务端暴露什么能力，不能只按返回内容是否为文本来判断。

## 调用后得到什么

以订单服务为假设例子：

| 能力 | 请求与返回 | 订单例子 |
| --- | --- | --- |
| Tool | `tools/call` 传入工具名与参数，得到执行结果 | `query_order` 查询状态，`cancel_order` 取消订单 |
| Resource | `resources/read` 传入 URI，得到资料内容 | 读取 `orders://A001` 对应的订单数据 |
| Prompt | `prompts/get` 传入模板名与参数，得到提示消息 | `explain_order` 返回解释订单所需的指令与消息 |

[[mcp-tools-summary|Tool]] 可以只读，也可以修改数据，因此查询订单同样可以做成工具。Resource 以可寻址的资料供应用读取；同一份订单数据可由两种接口提供，差别在于把它暴露为「查询操作」还是「订单资源」。

[[mcp-resources-prompts-summary|Resource 与 Prompt]]都可带参数：资源模板用参数形成 URI，提示模板用参数形成消息。获取 Prompt 只完成输入准备，宿主还要调用模型，才会得到解释或答案。

## 谁决定使用

官方的典型分工是：模型选择 Tool，应用选择并组织 Resource，用户选择 Prompt。**「控制」描述使用入口，不表示谁编写内容，也不等于拥有执行权限。** Prompt 内容由服务端提供；Resource 也可以由用户挑选，或根据模型建议加载。协议没有强制固定的交互界面。

服务端不必全部提供三类能力，宿主也须实现相应支持。资源不会因被列出就自动进入上下文，工具也不会因被模型选中就绕过应用的权限检查。

三者可以配合：用户选择解释订单的 Prompt，应用读取订单 Resource 并组织模型输入；若用户随后要求取消，再使用 Tool 执行。这是组合示例，不是每次请求都必须经过的顺序。
