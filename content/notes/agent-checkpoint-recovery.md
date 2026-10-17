---
learning_status: organized
parent: agent
title: "Agent 的中断恢复机制"
aliases: ["Agent Checkpoint", "Agent 中断恢复"]
category: "Agent"
tags: ["Agent", "Checkpoint", "持久化"]
created_at: "2026-10-09"
updated_at: "2026-10-17T21:53:38+08:00"
reading_suggestions:
  - eino-checkpoints
  - agent-checkpoint-runtime
  - idempotency
  - langgraph-checkpoints
learning_status_changed_at: "2026-10-17T21:55:00.656+08:00"
---

**中断恢复（Interruption Recovery）是利用持久保存的数据与执行进度，在中断后接续未完成任务的机制。**

Agent 意外退出，或暂停等待用户[[agent-human-in-the-loop|审批]]、补充信息与外部结果后，可以由原进程或新进程接手，复用已完成的工作。

在[[agent-loop|Agent Loop]]中，程序可以在模型完整返回、工具结果返回后，把已有结果和下一步一起写入数据库或文件。

**检查点（Checkpoint）就是这样持久保存的一份运行状态记录，包含继续任务所需的数据与执行位置。**

![[assets/agent-loop-checkpoints.png]]

恢复时，程序读取最近成功保存的检查点，按记录继续处理工具请求、调用模型或返回已有回答。等待中的任务仍须满足继续条件，已取消的任务不再执行；尚未保存的工作可能需要重做。

检查点也不能保证外部操作只发生一次：远端已成功、本地结果未保存时，需要查询原结果或依赖远端的[[idempotency|幂等保证]]重试。

[[agent-checkpoint-runtime|中断恢复的实现]]主要确定两件事：检查点放在哪里，以及保存哪些信息。保存与恢复也可使用 [[eino-checkpoints|Eino]]、[[langgraph-checkpoints|LangGraph]] 或 [[temporal-durable-execution|Temporal]] 提供的能力。
