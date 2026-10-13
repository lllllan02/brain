---
learning_status: pending
title: "用 Temporal Go SDK 等待审批"
parent: agent-checkpoint-recovery
category: "Agent"
tags: ["Agent", "人工介入", "持久化", "Go"]
created_at: "2026-10-13T11:07:38+08:00"
updated_at: "2026-10-13T11:10:51+08:00"
type: practice
---

自建状态机需要维护存储、调度和唤醒。使用 Temporal 时，可把这部分交给工作流服务：**工作流等待人的消息，批准后调度发布操作，事件历史支持工作进程重启后的恢复。** 业务仍负责审批权限和发布接口幂等。

## 一次等待由谁保存？

[[temporal-durable-execution|Temporal 的恢复机制]]把流程代码和外部操作分开。工作流（Workflow）负责等待、判断和调度；活动（Activity）是框架调度的外部操作单元，执行网络、文件或模型调用。工作进程（Worker）重建工作流时，用历史中已记录的结果恢复控制状态，因此工作流内使用 SDK 的等待原语，不能用普通 channel 或 `time.Sleep` 替代。

冻结草稿作为工作流输入，人的决定通过异步信号（Signal）进入；Signal 提交成功仅表示服务接收，尚不表示工作流消费或发布成功。需要返回业务校验结果时，可选择带校验器、能返回处理结果的更新请求（Update）。

## Go 里怎样表达这个控制流？

完整接入示例在 `content/assets/agent-temporal-review.go`。`Proposal` 保存审批 ID、稳定操作 ID、目标和正文；`Decision` 保存审批 ID 与是否批准。下面节选其中 `Review`，由 Worker 调用；`Publish` 是宿主注册的幂等 Activity：

```go
func Review(ctx workflow.Context, p Proposal) (string, error) {
    ch := workflow.GetSignalChannel(ctx, "review")
    var d Decision
    for {
        ch.Receive(ctx, &d)
        if d.RequestID == p.RequestID {
            break
        }
    }
    if !d.Approved {
        return "rejected", nil
    }
    ctx = workflow.WithActivityOptions(ctx, workflow.ActivityOptions{
        StartToCloseTimeout: time.Minute,
        ScheduleToCloseTimeout: 5 * time.Minute,
    })
    var receipt string
    err := workflow.ExecuteActivity(ctx, "Publish", p).Get(ctx, &receipt)
    return receipt, err
}
```

`Receive` 等到匹配的审批请求，拒绝直接结束，批准才安排 Activity。Activity 的实际回执交回工作流；已记录的回执可供重放使用，但外部效果已发生、完成尚未记录时，Activity 仍可能重试，所以 `Publish` 必须使用 `p.OperationID` 处理重复请求。

## 接到已有应用里，还缺哪几处？

源码的 `Serve` 接收宿主注入的 Client 和发布函数，在 `review-queue` 注册 `Review`，并以名称 `Publish` 注册 Activity。宿主用 `ExecuteWorkflow` 与相同任务队列（Task Queue）启动流程；审核入口先完成认证和资格校验，再调用源码中的 `Submit`，通过 `SignalWorkflow` 传入 Workflow ID、Run ID 与决定。

这段代码只呈现持久等待与 Activity 的连接。审批超时、编辑、取消、完整版本校验和重复回复处理仍需按[[agent-approval-protocol|审批协议]]补齐；示例中的一分钟和五分钟是 Activity 执行限时，不是等待审批的期限。

接口按 2026-10-13 官方 Go SDK 文档核对，依赖 `go.temporal.io/sdk`，实际版本须在宿主 `go.mod` 中固定；未编译或联调，也不包含服务部署。可直接运行并已有验证记录的是[[agent-resume-practice|标准库示例]]。
