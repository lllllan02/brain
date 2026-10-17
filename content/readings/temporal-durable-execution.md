---
title: "Temporal：通过事件历史恢复，并等待外部决定"
parent: agent-checkpoint-recovery
category: "Agent"
tags: ["Agent", "持久化", "重放", "Go"]
created_at: "2026-10-13T10:59:51+08:00"
updated_at: "2026-10-17T20:58:54+08:00"
source:
  - "https://docs.temporal.io/workflow-execution"
  - "https://docs.temporal.io/develop/go/workflows/basics"
  - "https://docs.temporal.io/develop/go/workflows/message-passing"
reading_suggestions:
  - temporal-retry-policy-summary
---

**「Temporal 用事件历史恢复工作流，Go 代码中的等待由 SDK 转换为可恢复的执行过程。」** 本文只总结恢复与外部输入，不覆盖完整平台部署；依据 2026-10-13 官方文档，未运行 Temporal 服务。

## Worker 退出后，局部变量怎样回来？

[Workflow Execution](https://docs.temporal.io/workflow-execution) 将工作流执行与 Worker 进程分开。服务保存 Event History，Worker 丢失缓存或故障后可重新执行工作流代码，并把产生的命令与历史核对，重建运行状态。已记录的 Activity 完成结果供重放使用；无需把原进程内存一直保留到人回复。

这要求**「工作流控制流具有确定性」**。[Go Workflow basics](https://docs.temporal.io/develop/go/workflows/basics#develop-workflow-logic) 因而要求用 SDK 的时钟、等待和并发原语；文件、网络及模型调用等外部操作交给 Activity。普通 goroutine、channel 和 `time.Sleep` 不会自动获得持久化能力。

如果 Activity 的**「外部效果已经发生，但完成尚未可靠记录，仍可能重试」**。工作流重放与 [[temporal-retry-policy-summary|Activity 重试]]必须分开理解，外部业务还需幂等或结果核对。

## 人的回答通过什么进入？

[Go 消息文档](https://docs.temporal.io/develop/go/workflows/message-passing) 区分三种入口：

| 消息 | 用途 | 接口返回代表什么 |
| --- | --- | --- |
| Query | 查询当前状态 | 获得查询结果；不允许修改状态 |
| Signal | 异步提交决定 | 服务已接收；不代表工作流已消费或操作已完成 |
| Update | 校验并修改状态、返回结果 | 可等待接受或完成，具体取决于调用阶段 |

Go 工作流通过 `workflow.GetSignalChannel` 接收 Signal；客户端通过 `SignalWorkflow` 指定 Workflow ID、可选 Run ID 和载荷。Signal 会进入事件历史，因此与进程内临时 channel 的生命周期不同。

需要及时告知「审批版本过期」时，可使用带 Validator 的 Update；Validator 不应修改状态。无论选哪一种，都仍要由业务认证入口确认操作者，避免把消息载荷中的名字当作身份证明。
