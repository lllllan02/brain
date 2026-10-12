---
title: "MCP 的完整接入流程"
parent: mcp
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-09"
updated_at: "2026-10-12T12:13:32+08:00"
---

**MCP 接入的主线是：连接服务 → 发现工具 → 模型提出调用 → 服务端执行 → 结果交回模型。** 宿主应用（Host）组织模型与上下文，内部的客户端（Client）负责通信，服务端（Server）保存工具定义与执行实现。

![[assets/mcp-flow.png|MCP 接入与工具调用顺序]]

## 接通服务，取得定义

Server 注册工具定义和处理函数；Host 配置启动命令或服务地址，按需完成[[mcp-permissions|授权]]。stdio 由 Client 启动本地进程，HTTP 则访问独立运行的 Server。

Client 通过 `tools/list` 获取工具定义，Host 筛选并适配成模型工具格式，同时记录「模型工具名 → Client 与原工具名」的映射。**「定义交给模型，执行代码留在 Server。」**

图按 `2026-07-28` 版绘制：可先用 `server/discover` 发现版本与能力，每个请求仍携带相应元数据；旧版使用 `initialize` 握手，差异保留在 [[mcp-architecture-summary|官方架构导读]]。

## 从模型请求到执行结果

模型返回工具名与参数后，Host 校验参数和权限，按映射找到 Client，发送 `tools/call`。Server 查找处理函数、检查业务权限并执行，再经 Client 返回结果。

Host 将结果关联到原模型调用，加入上下文再次请求模型。模型可以回答用户，也可继续调用，回到图中③；连接和定义通常可以复用。[[mcp-tool-calling-go|Go 最小实现]]展示了这段循环的接法。

## 后续使用与结束

[[mcp-capabilities|资源与提示模板]]由 Host 按需读取并加入上下文，不经过工具调用。工具目录变化时重新发现并更新映射，通知机制见架构导读；不再使用时关闭 Client、订阅及所启动的本地进程。
