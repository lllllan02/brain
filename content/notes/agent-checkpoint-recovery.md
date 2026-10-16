---
learning_status: pending
parent: agent
title: "Agent 的中断恢复机制"
aliases: ["Agent Checkpoint", "Agent 中断恢复"]
category: "Agent"
tags: ["Agent", "Checkpoint", "持久化"]
created_at: "2026-10-09"
updated_at: "2026-10-14T16:10:58+08:00"
reading_suggestions:
  - eino-checkpoints
  - agent-checkpoint-runtime
  - agent-resume-failure
  - langgraph-checkpoints
  - agent-temporal-approval
  - langgraph-time-travel
---

Agent 可能因故障退出，也可能暂停等待审批或外部结果。我们希望新进程能接手原任务，复用已完成的工作，而不必从头再做。

**中断恢复（Interruption Recovery）就是利用已保存的进度，接续未完成任务的机制。**

## 新进程凭什么接手？

新进程需要知道任务做到了哪里，以及继续执行需要什么。以「生成草稿 → 审批 → 发布」为例，仅保存对话未必能确定草稿版本、审批结果和发布状态；让模型猜测，可能重写已审核的草稿或重复发布。

因此，需要将任务数据与执行进度一起持久保存，供程序判断下一步。

**检查点（Checkpoint）是在明确执行边界保存的状态记录，包含继续任务所需的数据与执行位置。**

例如，进入审批前，把任务 ID、草稿、审批 ID 和「等待审批」状态一起写入数据库。新进程读到后，就能复用草稿并继续等待。[[agent-checkpoint-runtime|检查点的保存与调度]]展开了保存时机、状态一致性与并发接手问题。

## 保存后怎样继续？

检查点提供恢复依据，调度器负责找到可执行任务，交给工作进程继续处理。审批场景中的过程是：

生成草稿并保存等待状态 → 收到审批决定并更新状态 → 调度执行发布 → 保存结果。

![[assets/agent-checkpoint-recovery-flat-v3.png]]

[[agent-human-in-the-loop|审批入口]]校验决定是否对应当前草稿；等待期间可以退出进程，无需一直保留线程或连接。

意外退出时，系统从最近可靠保存的进度接手；主动等待的任务则要等恢复条件满足。两种情况都只能从已定义的边界继续，尚未保存的工作可能重做。

## 为什么恢复仍可能重复操作？

如果远端已发布成功，进程却在保存回执前崩溃，本地仍显示未完成，恢复后就可能再次发布。检查点无法自动消除外部操作与本地保存之间的时间差。

这需要接收端按稳定操作 ID 去重，或核对远端结果后再决定是否重试。[[agent-resume-failure|恢复时的重复执行]]解释了这个故障窗口及处理边界。

## 哪些工作可以交给框架？

状态保存与恢复调度可以自建，也可以交给框架。Go 项目可用 [[eino-checkpoints|Eino 的检查点与中断恢复]]：工具发出中断，Runner 将执行状态写入配置的存储；收到审批后，应用调用恢复接口，把决定送回对应工具。

[[langgraph-checkpoints|LangGraph]]保存图状态和后续执行信息；[[temporal-durable-execution|Temporal]]保存事件历史，通过重放重建工作流状态，[[agent-temporal-approval|Go 审批接入]]展示了它的持久等待方式。两者都仍需业务处理审批校验与外部操作的重复执行。

故障恢复接续已有进度；主动选择旧检查点则会重做后续工作。[[langgraph-time-travel|历史重放与分叉]]也可能再次调用外部工具，不能当作只读回看。
