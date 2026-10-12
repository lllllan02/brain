---
title: "MCP 官方架构：发现、调用与通知"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-11T00:40:07+08:00"
updated_at: "2026-10-12T12:08:03+08:00"
source:
  - "https://modelcontextprotocol.io/docs/2026-07-28/learn/architecture"
  - "https://modelcontextprotocol.io/specification/2026-07-28/server/discover"
  - "https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning"
  - "https://modelcontextprotocol.io/specification/2026-07-28/basic/transports"
  - "https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/stdio"
  - "https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http"
  - "https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle"
---

**MCP 将消息语义与传输方式分开：数据层规定交互内容，传输层负责递送消息。** 本文节选官方架构与相关规范中「接入、发现、工具调用和通知」的内容，以 `2026-07-28` 为主，并对照 `2025-11-25` 的初始化流程；未运行协议示例。

## 谁负责哪一段

宿主应用（Host）组织模型和上下文，并为对接的服务创建客户端（Client）；服务端（Server）提供工具、资源和提示模板。MCP 约定 Client 与 Server 的交互，模型如何选择工具、Host 如何组织下一轮请求由应用决定。

这一区分意味着：发现工具后，Host 仍要把定义转换成模型接口接受的形式；收到结果后，也仍要把它放回模型上下文。协议连通本身不会自动形成 Agent 循环。

## 传输怎样建立

[传输规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports)保留相同的 JSON-RPC 消息语义，两种标准传输负责不同的递送方式：

| 方式 | 启动与收发 | 结束 |
| --- | --- | --- |
| stdio | Client 启动 Server 子进程，向其 stdin 写入消息，从 stdout 读取；一行一条 JSON-RPC 消息，日志写 stderr | 关闭子进程输入，等待退出，必要时终止进程 |
| Streamable HTTP | Server 独立运行；Client 向同一个 MCP endpoint 发送 POST，响应为 JSON 或属于该请求的 SSE 流 | 释放 HTTP 连接与订阅流；不关闭远程服务进程 |

`2026-07-28` 的 HTTP 传输移除了协议级会话与独立 GET 流。变更通知通过 `subscriptions/listen` 请求的响应流递送，不能照搬旧版的会话与 SSE 接入方式。需要认证时按服务的授权方案配置；传输连通不替代业务权限检查。

## 发现版本与能力

[Discovery](https://modelcontextprotocol.io/specification/2026-07-28/server/discover) 返回 `supportedVersions`、`capabilities` 和服务身份。例如，`tools: {}` 表示服务支持工具功能，工具的具体名称与参数要再查询 `tools/list`。

服务端必须实现 `server/discover`，客户端可以选择先调用它，也可直接发送功能请求。发现结果支持缓存；每个请求仍须在 `_meta` 中声明协议版本与客户端能力，通常还带上客户端身份。HTTP 会将部分元数据映射到请求头，消息正文仍是依据。

[版本规范](https://modelcontextprotocol.io/specification/2026-07-28/basic/versioning)说明，服务端逐请求接受或拒绝所声明的版本。不支持时返回 `UnsupportedProtocolVersionError` 与支持列表，客户端选择双方共同支持的版本重试；没有共同版本则报告不兼容。发现服务身份只方便展示与诊断，不能将自报身份当作可信认证。

## 从定义到执行结果

官方天气工具示例依次展示：`tools/list` 得到名称、描述与 `inputSchema`，Host 将定义提供给模型；模型提出工具名和城市参数，Host 经 Client 发出 `tools/call`；Server 执行业务逻辑并返回内容，Host 再把内容交给模型。

JSON-RPC `id` 关联 MCP 请求与响应。模型接口另有自己的调用标识，Host 负责连接这两段交互。工具的输入、输出、名称冲突与错误表达由 [[mcp-tools-summary|Tools 规范]]进一步约定。

## 列表变化怎样同步

服务端声明 `tools.listChanged` 后，Client 可用 `subscriptions/listen` 请求订阅 `toolsListChanged`。服务端先确认实际接受的通知类型，再发送相应变化通知；通知不包含完整新目录，Client 收到后重新 `tools/list` 并更新映射。

通知按尽力交付，重连时可能丢失，因此客户端还需用轮询等方式保持目录新鲜。订阅是按需启用的维护机制，不是每次工具调用前的固定步骤。

## 与旧版初始化的区别

[2025-11-25 生命周期](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)要求先发送 `initialize`，交换协议版本、能力和实现信息；Client 接受响应后发送 `notifications/initialized`，再进入正常操作。关闭使用底层传输机制，没有专门的 MCP shutdown 请求。

`2026-07-28` 改为逐请求元数据，不再要求这套握手。兼容两代的实现须按传输规范探测并回退；只支持旧版的 Client 不会因为改一个版本字符串就自动支持新版。SDK 的连接方法可能隐藏这些交互，判断适用流程应核对它实际支持的协议版本。
