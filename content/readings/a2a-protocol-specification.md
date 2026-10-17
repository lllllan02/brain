---
title: "A2A：发现、任务生命周期与协议边界"
parent: a2a
category: "Agent"
tags: ["Agent", "A2A", "协议"]
created_at: "2026-10-13T17:41:05+08:00"
updated_at: "2026-10-18T00:22:52+08:00"
source: ["https://a2a-protocol.org/v1.0.0/specification/", "https://a2a-protocol.org/latest/topics/key-concepts/", "https://a2a-protocol.org/latest/topics/life-of-a-task/", "https://a2a-protocol.org/latest/topics/a2a-and-mcp/", "https://a2a-protocol.org/latest/tutorials/python/4-agent-executor/"]
learning_status: pending
---

A2A 统一独立 Agent 服务的外部交互，内部模型与工具无需公开。本文节选 [1.0.0 规范](https://a2a-protocol.org/v1.0.0/specification/)、官方概念页与 Python 执行器教程，覆盖发现、消息收发、任务推进及业务执行入口。协议字段与执行器教程核对于 2026-10-18，概念页沿用 2026-10-17 的阅读；未执行互操作测试，也未覆盖完整部署、全部安全机制与扩展。

## 协作需要哪些对象？

[Core Concepts](https://a2a-protocol.org/latest/topics/key-concepts/)中，Client 发起请求，Server 承担处理；Client 不必也是 LLM。Agent Card 描述能力、接口与认证要求；Message 用文本、文件或结构化 Part 传信息；Task 跟踪持续工作，Artifact 承载成果。简单交互可以直接返回 Message。

[Life of a Task](https://a2a-protocol.org/latest/topics/life-of-a-task/)用 `taskId` 指定工作，用 `contextId` 关联相关任务与消息。任务等待输入或认证后可继续；完成、失败、取消或拒绝后不能重新打开，后续修订需新任务，可沿用 context。

## Agent Card 如何指导接入

[规范 §8](https://a2a-protocol.org/v1.0.0/specification/#8-agent-discovery-the-agent-card)要求服务端提供 Agent Card，客户端可从 `/.well-known/agent-card.json`、目录服务或预先配置取得。Card 解决的是发现能力与配置连接的问题，服务地址仍需有来源。

`skills` 描述业务能力；`supportedInterfaces` 按偏好顺序声明接口 `url`、`protocolBinding` 和 `protocolVersion`，客户端选择最靠前且自身支持的接口。安全方案由 `securitySchemes` 定义，由 `security` 声明要求；凭据取得与请求认证依据相应安全方案完成。能力描述不能代替业务实现，也不能证明服务可信。

## HTTP 调用与返回

[规范 §11](https://a2a-protocol.org/v1.0.0/specification/#11-httpjsonrest-protocol-binding)将操作映射到 HTTP 方法与路径，使用 JSON 请求和响应：发送消息为 `POST /message:send`，查任务为 `GET /tasks/{id}`，取消为 `POST /tasks/{id}:cancel`。路径相对于 Card 声明的接口地址；§11 指定 `Content-Type: application/json`，协议版本通过 `A2A-Version` 请求头声明，例如 `1.0`。

[§3.2](https://a2a-protocol.org/v1.0.0/specification/#32-operation-parameter-objects)中，发送请求包含 `message`，可选 `configuration`。默认 `returnImmediately: false`，等待任务进入终态或等待输入／认证的暂停状态；设为 `true` 后先返回任务，再由客户端查询、订阅或接收推送。该参数不影响直接 Message 答复，也不控制流式调用。

[§4.1](https://a2a-protocol.org/v1.0.0/specification/#41-core-objects)规定 Message 包含 `messageId`、`role` 与 `parts`。`ROLE_USER` 是客户端发出的消息，`ROLE_AGENT` 是服务端发出的消息，不能据此判断调用方是不是模型。每个 Part 在 `text`、`raw`、`url`、`data` 中选一种内容表达；`mediaType` 可标明类型，文件 URL 的访问仍需调用双方处理。

发送消息的响应用 `task` 或 `message` 包装返回对象；查询任务则返回 Task 本身。Task 的 `id` 是服务端生成的任务编号，`status.state` 使用 `TASK_STATE_SUBMITTED`、`TASK_STATE_WORKING` 等枚举；成果放在 `artifacts`，每个 Artifact 必须包含 `artifactId` 与非空 `parts`。因此接收成功、任务完成和取得成果可以分别判断。

[§6.3](https://a2a-protocol.org/v1.0.0/specification/#63-multi-turn-interaction)展示补输入：服务端返回 `TASK_STATE_INPUT_REQUIRED` 和询问消息，客户端再次发送 Message，并在其中带原 `taskId`。客户端不必同时发送 `contextId`，服务端可从任务推知；若两个都发则必须匹配。终态任务的后续修订要创建新任务，可沿用原 context。

## 询问如何传回客户端

[§4.1.2 TaskStatus](https://a2a-protocol.org/v1.0.0/specification/#412-taskstatus)的 `message` 可携带与状态关联的消息；等待输入用 `TASK_STATE_INPUT_REQUIRED` 表达。结合 §6.3 的多轮示例，询问是任务状态与问题内容的交付，回答则是带原 `taskId` 的新客户端 Message。

[§3.2.2](https://a2a-protocol.org/v1.0.0/specification/#322-sendmessageconfiguration)规定默认阻塞发送在任务进入等待输入状态时返回，因此可以直接用原 HTTP 响应交付问题。非阻塞模式先返回任务，客户端后续通过 GetTask 读取当前状态及消息。

[§3.5](https://a2a-protocol.org/v1.0.0/specification/#35-task-update-delivery-mechanisms)另定义流式与推送交付：SSE 在客户端已建立的连接上发送 `statusUpdate`，其中 `status` 可包含询问消息；推送则要求客户端先配置回调 URL，由服务端 POST 更新。Webhook 不是多轮交互的必需条件。流到达等待输入状态可关闭；补输入后需继续查询或重新建立流，不能假定原连接永久存在。

规范定义任务的等待与续接语义，不规定用挂起线程实现。应用可以保存任务及继续所需的输入／进度，结束当前执行，收到补充 Message 后按任务编号再次执行；具体恢复位置和保存方式属于服务端实现。

## 请求如何接到 Agent 代码

[官方 Python Agent Executor 教程](https://a2a-protocol.org/latest/tutorials/python/4-agent-executor/)把两层代码分开：服务应用与请求处理器管理协议，`AgentExecutor.execute(context, event_queue)` 连接具体业务。示例先复用 `context.current_task`，没有任务时用 `new_task_from_user_message` 创建，再通过事件队列发布任务。

执行器随后用 `TaskUpdater` 发布 `TASK_STATE_WORKING`，从消息提取文本，调用 `self.agent.invoke(user_request=query)`；将返回文本通过 `add_artifact` 发布，最后更新为 `TASK_STATE_COMPLETED`。事件队列让请求处理层取得状态和成果，按所选调用方式返回给客户端。

教程中的 Agent 只返回一条固定格式的 Hello World 文本，没有真正调用模型。这使职责可见：SDK 处理协议对象与事件传递，开发者把 `invoke` 替换为自己的模型／工具执行逻辑。使用 Go 或其他实现时可沿用这一分工，具体类型和函数名须按所选 SDK 核对。

## 接入时要处理什么？

1.0.0 将公共模型映射到 JSON-RPC、gRPC、HTTP+JSON/REST 等绑定。HTTP 流式发送使用 `/message:stream`，经 SSE 交付任务快照、状态更新与产物更新；推送通过已配置的回调地址交付更新。可选能力按 Card 核对。

概念页仍有「全部请求使用 JSON-RPC」的旧概括，规范内部个别示例也保留旧版本头或不同媒体类型。接入以选定版本的对象定义和绑定章节为准，固定 SDK 版本，不直接拼接不同教程的报文。

发送消息是否去重由实现决定，`messageId` 不是必然的幂等保证。取消请求可能因任务阶段失败；认证与任务访问仍需服务端检查，Card 的能力声明也不能证明服务可信或结果正确。

[A2A and MCP](https://a2a-protocol.org/latest/topics/a2a-and-mcp/)按接口职责区分协作任务与工具接入：远端 Agent 可通过 A2A 接任务，再用 MCP 调工具。协议统一交互，合作对象选择和业务效果验收仍归应用。
