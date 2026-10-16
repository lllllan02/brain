---
title: "Temporal 官方文档：平台与执行分工"
parent: temporal
category: "分布式系统"
tags: ["工作流", "持久化", "重放"]
created_at: "2026-10-14T16:14:09+08:00"
updated_at: "2026-10-14T16:14:09+08:00"
read: false
source:
  - "https://docs.temporal.io/temporal"
  - "https://docs.temporal.io/workflows"
  - "https://docs.temporal.io/activities"
  - "https://docs.temporal.io/workers"
  - "https://docs.temporal.io/task-queue"
---

Temporal 官方文档把平台的核心能力概括为**「持久执行（Durable Execution）」**：流程的进度可以跨进程故障保留，运行环境恢复后继续推进。以下节选平台组成、工作流恢复和任务分发的入门内容，按 2026-10-14 文档核对，未部署或实测。

## 服务保存进度，Worker 执行业务

[平台介绍](https://docs.temporal.io/temporal)将系统分为 Temporal Service 与运行应用代码的 Worker。Service 由服务端程序和数据库组成，也可以使用托管的 Temporal Cloud；采用托管服务时，业务代码的运行仍需要相应 Worker。

**Worker 是使用 Temporal SDK、拉取任务并执行应用代码的工作进程。** [Worker 文档](https://docs.temporal.io/workers)说明，它向服务报告执行结果，可以执行 Workflow 逻辑、Activity 逻辑，或同时承担两者。

**Task Queue（任务队列）是连接服务调度与 Worker 执行的命名队列。** [队列文档](https://docs.temporal.io/task-queue)说明，Worker 轮询指定队列获取任务；队列按需创建，无需预先手动注册。客户端发起流程与 Worker 监听的队列需要匹配，才能让相应代码得到执行。

## 为什么要分开 Workflow 与 Activity？

**Workflow（工作流）是用代码定义步骤、分支和等待的流程。** [Workflow 文档](https://docs.temporal.io/workflows)区分定义与执行：同一份代码可接收不同输入，形成彼此独立的执行实例。

服务保存有序的事件历史（Event History），例如定时器启动、Activity 完成及其结果、外部信号到达。需要重建状态时，SDK 重跑 Workflow 代码，利用历史结果恢复控制状态；已有缓存时不必每次从头重放。它不依赖保存整个进程的内存快照。

因此，同一段 Workflow 面对相同历史必须作出一致决定。直接读取系统时间、随机取值或调用外部接口可能改变分支，应使用 SDK 提供的安全原语，或把外部交互交给 Activity。相关限制与外部消息接口已有[[temporal-durable-execution|恢复机制导读]]。

**Activity（活动）是执行一项具体操作的函数或方法。** [Activity 文档](https://docs.temporal.io/activities)允许它调用接口、操作数据库或访问文件等，不要求执行逻辑具有确定性。将外部操作分开后，Workflow 可以复用已记录的结果，Activity 则按需要重试。

## 恢复与重试的边界

重放遇到已经记录完成的 Activity 时，使用历史结果，不再执行相同操作；Activity 自身失败或结果未被确认时，则可能产生新的执行尝试。文档建议 Activity 具备幂等性，避免重试造成重复副作用；每次尝试通常从函数开始，长任务需要自行利用心跳详情等能力保存进度。

[[temporal-retry-policy-summary|重试策略导读]]进一步区分 Activity 重试与整条 Workflow 重试：前者默认启用，后者默认不启用。恢复已有流程的状态，不等于重新发起一遍完整业务。

Worker 文档还说明，等待中的 Workflow 可以从工作进程缓存移除，后续事件到来时在相同或其他 Worker 重建。因此，长时间等人或等定时器不要求原进程始终保存这段流程的内存状态；需要实际执行代码时仍须有可用 Worker。
