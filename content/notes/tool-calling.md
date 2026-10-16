---
learning_status: understood
parent: agent
title: "工具调用"
aliases: ["Tool Calling", "Function Calling", "函数调用"]
category: "Agent"
tags: ["Agent", "工具调用"]
created_at: "2026-10-09"
updated_at: "2026-10-12T13:50:46+08:00"
reading_suggestions:
  - tool-calling-flow
  - tool-interface-design
  - tool-registry
  - tool-loading
  - tool-permissions
  - tool-scheduling
  - sandbox-execution
  - agent-retry
  - mcp
---

**工具调用（Tool Calling）是模型提出操作请求、外部程序执行操作，再把结果交回模型的交互机制。**

模型自身不能直接访问外部数据或执行实际操作。工具调用将外部能力接入模型的工作过程，使其能够获取信息、执行操作，并依据真实结果继续决策。

![[assets/tool-calling-overview.png|工具调用全景：定义加载、模型请求、权限与调度、工具执行及结果回传]]

[[tool-calling-flow|调用流程]]连接「工具定义、调用请求、执行结果」：模型依据定义生成名称与参数，程序执行后按调用 ID 回传结果。模型再回答或继续调用；[[agent-loop|Agent Loop]]负责组织反复决策与执行，并设置终止条件。

## 工具怎样进入模型的可用范围？

[[tool-interface-design|接口设计]]让模型能选对工具、填对参数、读懂结果；[[tool-registry|注册表]]把工具名称与定义、执行入口对应起来。工具较多时，[[tool-loading|按需加载]]只提供当前需要的完整定义，减少上下文占用与选择干扰。

工具可以直接接入本地函数或 API。多个应用需要复用外部服务时，[[mcp|MCP（模型上下文协议）]]统一能力发现与访问方式，将远端工具接入同一调用链；模型决策与后续循环仍由应用组织。

## 调用怎样受控执行？

**「可见、获准、可以立即启动」是不同条件。** [[tool-permissions|权限与审批]]判断是否允许本次操作；[[tool-scheduling|执行调度]]根据依赖、冲突与容量决定启动时机。这些程序侧的执行管理属于 [[agent-harness|Harness]]。

获准后的运行仍受[[sandbox-execution|沙箱与执行环境]]限制。执行失败或结果未知时，按条件[[agent-retry|重试]]；超时不能视为操作未生效。回传内容只是执行证据，不能自行改变原有指令或权限。
