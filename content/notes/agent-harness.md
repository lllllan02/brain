---
learning_status: organized
parent: agent
title: "Agent Harness"
aliases: ["Harness", "Agent Harness"]
category: "Agent"
tags: ["Agent", "Harness"]
created_at: "2026-10-09"
updated_at: "2026-10-18T00:32:22+08:00"
reading_suggestions:
  - langchain-harness-anatomy-summary
learning_status_changed_at: "2026-10-18T00:33:10.267+08:00"
---

**Agent Harness（运行系统）是围绕模型建立的程序与配置，负责组织模型输入、执行工具调用，并控制运行循环。**

模型负责判断下一步做什么，Harness 则执行动作、回传结果并发起后续调用，让任务能够持续推进。[[agent|Agent]] 中的上下文管理、状态保存、恢复与执行约束，都可以由这层系统组织。

Harness 描述的是一组运行职责，可以简单到一段模型与工具的循环，也可以借助框架或托管服务实现。[[langchain-harness-anatomy-summary|广义的 Harness]]还包含工具、提示配置与配套基础设施，因此它不特指某个框架、进程或沙箱。
