---
title: "Anthropic：把 Harness、会话记录与沙箱解耦"
parent: agent-harness
category: "Agent"
tags: ["Agent", "Harness"]
created_at: "2026-10-11T11:46:46+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source: "[Scaling Managed Agents: Decoupling the brain from the hands](https://www.anthropic.com/engineering/managed-agents)"
---

**「Managed Agents 将会话记录、Harness 和执行环境拆开，用稳定接口支持运行机制的变化与独立恢复。」**

## 为什么不继续放在同一个容器？

同容器设计便于直接操作文件，也省去服务边界；代价是会话、控制逻辑与执行环境一起失效。连接私有网络时，又被迫迁移整个运行系统或对接网络，难以只更换执行位置。

作者希望保留状态和计算这些稳定需求，让具体 Harness 随模型能力演进。因此，**「拆分对象是职责与生命周期」**，而不只是增加服务数量。

## 拆开之后怎样运行与恢复？

| 部分 | 职责与故障处理 |
| --- | --- |
| 会话日志 | 独立保存追加事件，成为恢复依据 |
| Harness | 调用模型、路由工具、写入事件；进程失败后从日志恢复 |
| 沙箱与工具 | 执行动作；环境故障作为工具错误返回，必要时重建 |

Harness 通过统一工具接口调用环境，无需假设文件和模型控制进程位于同一容器。沙箱也可按需启动，避免每次会话都等待环境初始化，并支持一个运行系统连接多种执行环境。

## 为什么日志不能等同于上下文？

上下文裁剪和压缩会选择性丢弃信息，但后续任务可能仍需旧记录。独立日志保留原始事件，Harness 读取需要的片段并组织模型输入；这样，存储可靠性与上下文策略可以分别改变。

安全边界也随之明确：**「不可信代码所在的沙箱不应能读取外部服务凭据」**；原文通过资源绑定及凭据代理等方式完成授权访问。

这套设计允许替换 Harness，而非要求永久保留某一套补偿机制。它来自托管服务，解耦收益不能直接等同于所有本地 Agent 都应服务化。

## 原文定位

2026-04-08。重点读 `Don’t adopt a pet`、`Decouple the brain from the hands`、`The session is not Claude’s context window` 与扩展性讨论。
