---
learning_status: pending
title: "MCP（模型上下文协议）"
parent: tool-calling
aliases: ["MCP", "Model Context Protocol", "模型上下文协议"]
category: "Agent"
tags: ["MCP", "工具调用", "协议"]
created_at: "2026-10-09"
updated_at: "2026-10-16T20:46:14+08:00"
reading_suggestions:
  - mcp-capabilities
  - mcp-flow
  - mcp-server
  - mcp-client
  - mcp-http-server
  - mcp-http-client
  - mcp-permissions
  - mcp-specification-summary
---

**MCP（Model Context Protocol，模型上下文协议）是 AI 应用与外部服务之间的开放通信协议，统一工具、资源和提示模板的发现与使用方式。**

每个 AI 应用分别适配订单、文件或数据库系统，会重复编写接入代码。MCP 让服务方按共同约定暴露能力，多个兼容应用可以复用同一个服务端；具体业务接口的适配集中在服务端完成。

![[assets/mcp-overview.png|MCP 的位置：宿主内的 Client 按协议与 Server 通信，Server 提供能力并访问实际系统]]

## 协议连接哪两端

按 [[mcp-architecture-summary|MCP 架构]]，客户端（Client）属于宿主应用（Host），与服务端（Server）交换消息。**「MCP 约定双方怎样通信，Host 负责把这些能力接入模型的工作过程。」**

Function Calling 让模型提出工具调用，MCP 将应用的请求送到外部服务，两者可以配合。[[mcp-flow|完整接入流程]]展开定义获取、执行与结果回传；[[mcp-tools-summary|Tools 规范]]约定参数、结果和错误的表达。接通协议后，模型决策、上下文组织与后续循环仍由 Host 负责。

## 服务端提供什么

[[mcp-capabilities|Tool、Resource 与 Prompt]]分别表示可调用的操作、可读取的数据和可复用的提示消息。服务端按需提供，宿主也须支持对应能力；[[mcp-resources-prompts-summary|资源读取与模板获取]]只提供资料或消息，是否加入上下文、何时调用模型仍由宿主决定。

[[mcp-specification-summary|协议规范]]统一能力的声明与使用方式，业务逻辑仍需实现。例如[官方天气工具示例](https://modelcontextprotocol.io/docs/2026-07-28/develop/build-server)仍需调用实际天气服务。

## 接入方式与权限

- stdio：[[mcp-client|Client]] 启动本地 [[mcp-server|Server]] 子进程，通过标准输入输出通信。
- Streamable HTTP：[[mcp-http-server|Server]] 独立运行，[[mcp-http-client|Client]] 通过 URL 连接，可用于远程接入。

[[mcp-permissions|接入授权、业务权限与操作确认]]分别判断能否访问服务、能操作哪些数据、是否批准本次动作。凭据由应用管理，服务端及下游系统检查业务权限。

多个应用需要复用外部能力时，MCP 可以减少重复接入；只有少量固定调用时，直接使用函数或 API 也可以。

## 工具已经通过 MCP 接通，为什么仍不能直接上线？

联调通常证明能够列工具并调用一次；真实使用还会发生服务重启、权限变化、定义更新、长任务等待和结果过大。协议连接成功，并不意味着运行系统知道如何处理这些状态。

接入时先确定每个 Server 的信任范围和权限来源，再明确调用超时、取消、重连以及业务错误的处理方式。对有副作用的工具单独检查重复调用契约；对大结果提供分页、引用或受限读取，避免直接撑满上下文。

验收应沿完整任务检查：模型看到了什么定义、程序调用了哪个服务、返回值是否被正确解释、断线后怎样继续。只测试协议报文合法，无法发现“请求已受理却被当成完成”等业务误解。
