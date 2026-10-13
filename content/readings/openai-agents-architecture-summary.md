---
title: "OpenAI Agents API：Harness、执行环境与应用的分工"
parent: agent-harness
category: "Agent"
tags: ["Agent", "Harness"]
created_at: "2026-10-11T11:46:46+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: "[Architecture](https://developers.openai.com/api/docs/guides/agents-api/architecture)"
---

**「Agents API 将模型运行、执行环境和业务应用分工，使是否配置计算环境成为任务需求，而不是运行 Agent 的前提。」**

## 三部分各自负责什么？

| 部分 | 职责 |
| --- | --- |
| 托管 Harness | 运行模型与工具循环，维持会话 |
| 执行环境 | 提供命令、代码执行与文件操作 |
| 应用服务 | 提交任务、接收事件、处理函数工具；自托管时管理环境生命周期 |

这解释了「使用托管 Harness」为什么不等于「所有动作都在服务商的沙箱里执行」。**「模型控制、工具处理与计算资源可以由不同参与者承担」**。

## 从不需要环境，到连接自有环境

仅回答问题或访问外部服务时，可以使用 `environment.type: none`。Harness 仍能调用远程 MCP；函数工具由应用收到请求后执行并返回结果。此时没有内置 Bash、补丁工具或工作区文件。

需要脚本、文件或产物时，再选择环境：

- `openai_hosted`：OpenAI 创建和管理沙箱；应用配置所需文件、软件包和网络访问。
- `self_hosted`：应用启动自有环境并连接 executor，由它执行 Harness 请求；应用负责重连、关闭及需要保留的文件。

自托管环境关闭前应确认没有待执行工作，不能只因某个事件返回就立即销毁计算资源。

## 接收通知不等于完成工具调用

Streaming 用于接收细粒度过程事件，Webhooks 通知会话状态变化，两者可组合。函数工具仍需要可用的处理器接收调用并交回结果；处理器失效可能使任务停在等待状态，生命周期处理故障也会影响环境管理。

## 原文定位与边界

依据 2026-10-11 在线文档，重点看 `The pieces`、三种环境模式与 `Receive progress and results`。这是产品架构说明，本文未运行 API，也未固定文档版本；字段与行为应在实际接入时重新核对。
