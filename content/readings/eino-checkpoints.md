---
title: "Eino 的检查点与中断恢复"
parent: agent-checkpoint-recovery
category: "Agent"
tags: ["Agent", "Checkpoint", "持久化", "Go"]
learning_status: pending
learning_status_changed_at: "2026-10-17T21:42:39.524+08:00"
created_at: "2026-10-14T14:43:35+08:00"
updated_at: "2026-10-17T21:37:05+08:00"
source:
  - "https://www.cloudwego.io/zh/docs/eino/core_modules/eino_adk/agent_hitl/"
  - "https://www.cloudwego.io/zh/docs/eino/core_modules/chain_and_graph_orchestration/checkpoint_interrupt/"
  - "https://github.com/cloudwego/eino/blob/v0.9.14/adk/runner.go"
  - "https://github.com/cloudwego/eino/blob/v0.9.14/adk/interrupt.go"
  - "https://github.com/cloudwego/eino/blob/v0.9.14/compose/checkpoint.go"
  - "https://github.com/cloudwego/eino/blob/v0.9.14/adk/chatmodel.go"
---

Go Agent 在工具执行前等待审批，需要把当前进度交给存储，再由后续请求接手。Eino 提供了这条路径：**工具发出中断 → 框架保存检查点 → 应用收到审批后发起恢复 → 工具读取原状态与审批结果，继续执行。**

本文节选官方中断恢复文档，并核对 Eino v0.9.14 源码，重点是 ADK 的 ChatModelAgent 与 Runner。项目现有实验也锁定该版本；本文未重新运行实验，不将在线文档中的其他版本接口混入示例。

## 工具怎样停下来，并保留待审批内容？

以发布草稿为例，工具在实际发布前返回 `compose.StatefulInterrupt(ctx, info, state)`。`info` 是给用户看的审批信息，`state` 是恢复时还要使用的草稿或操作 ID。这个特殊错误沿 Tool、ChatModelAgent 传播到 Runner，成为中断事件；不会像阻塞等待那样一直占住原来的调用。

[HITL 架构指南](https://www.cloudwego.io/zh/docs/eino/core_modules/eino_adk/agent_hitl/)区分两个标识：`CheckPointID` 定位整份执行记录，`InterruptID` 定位其中某个中断点。一次运行可以有多个工具等待不同决定，因此恢复时需要知道批的是哪一项，不能只凭「任务已恢复」就放行所有工具。

## 检查点里保存了什么？

[Runner 的保存实现](https://github.com/cloudwego/eino/blob/v0.9.14/adk/interrupt.go)收集运行上下文、中断 ID 到组件地址的映射、各组件的中断状态和流式模式，用 gob 编码成字节，再调用存储的 `Set`。组件地址用于找到恢复路径，组件状态用于还原该路径上的执行进度。

ChatModelAgent 内部还运行着 Graph。其内部检查点通过[桥接存储](https://github.com/cloudwego/eino/blob/v0.9.14/adk/chatmodel.go)进入 Agent 的中断状态；[Graph 检查点](https://github.com/cloudwego/eino/blob/v0.9.14/compose/checkpoint.go)保存节点输入、图状态、待重跑节点、通道及子图状态。因此保存对象既有业务数据，也有框架继续调度所需的信息，并非只有对话消息。

业务提供 `CheckPointStore`：v0.9.14 的接口是 `Get(ctx, id) ([]byte, bool, error)` 与 `Set(ctx, id, data) error`，通过 `adk.RunnerConfig.CheckPointStore` 注入。要跨进程恢复，存储须在进程退出后仍可读取；多实例还要能访问同一份数据。内存 map 只能演示同进程恢复。

## 新请求怎样继续原任务？

第一次执行时传入 `adk.WithCheckPointID(taskID)`，应用消费事件迭代器，检查 `event.Err`，并从 `event.Action.Interrupted.InterruptContexts` 取得待审批信息与中断 ID。收到可信审批结果后，恢复入口用相同 taskID 加载记录，把决定送到对应中断点。

下面是依据 v0.9.14 API 编写的接入片段，未独立编译，使用标准库 `context` 与 `github.com/cloudwego/eino/adk`；由审批处理器调用，`runner` 已配置相同 Agent 与持久存储，两个 ID 来自先前中断记录，`approved` 已通过业务校验。返回的迭代器仍由调用方消费并处理事件错误。

```go
func resumeApproval(ctx context.Context, runner *adk.Runner,
    taskID, interruptID string, approved bool,
) (*adk.AsyncIterator[*adk.AgentEvent], error) {
    return runner.ResumeWithParams(ctx, taskID, &adk.ResumeParams{
        Targets: map[string]any{interruptID: approved},
    })
}
```

[恢复实现](https://github.com/cloudwego/eino/blob/v0.9.14/adk/runner.go)先读取并解码检查点，将原状态与本次恢复数据放入运行上下文，再沿组件路径恢复。工具会重新进入执行函数，通过 `compose.GetInterruptState[T]` 读取之前保存的状态，通过 `compose.GetResumeContext[bool]` 判断自己是否是恢复目标及是否收到决定：未被选中或缺少决定就再次中断，拒绝则结束相应操作，同意才使用原草稿发布。

**恢复会重新执行中断的工具，不会从 `StatefulInterrupt` 后一行接着跑。** 所以发布等副作用必须放在恢复判断之后，不能在每次进入工具时无条件执行。`Runner.Resume` 的隐式恢复不携带逐项审批决定，不能直接替代上述审批入口。

## 配好存储后，是否就能应对任意退出？

不能把配置 Store 理解为每一步都会自动落盘。[Graph 手册](https://www.cloudwego.io/zh/docs/eino/core_modules/chain_and_graph_orchestration/checkpoint_interrupt/)提供节点前后断点、动态中断与外部主动中断；ADK Runner 在中断及特定受控取消路径保存。进程被强杀时未必有机会生成新检查点，只能利用此前已成功保存的记录。

存储写入失败必须作为错误处理；收到中断信息本身不足以证明落盘成功。新进程还要重建兼容的 Agent、工具和类型注册，检查点不会恢复进程的连接、锁或任意业务对象。自定义状态须可序列化，升级时也要核对旧记录兼容性。

应用仍负责审批权限、恢复请求的触发与并发控制，以及[[idempotency|外部操作的幂等]]。远端发布成功而检查点尚未更新时，恢复依旧可能重复调用；框架保存执行位置并不提供业务操作「恰好一次」的保证。
