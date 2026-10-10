---
parent: codex-sandbox-overview
title: "Codex 如何让长命令跨工具调用持续运行"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**执行会话保存的是一个仍在运行的进程，工具返回不代表进程退出。**

[`unified_exec`](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/unified_exec/mod.rs#L1)把启动与后续交互分开：`exec_command` 创建进程，未完成时返回会话标识；后续 `write_stdin` 按标识查找进程，写入输入并读取新输出。shell 状态可随该进程保留。

[进程管理器](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/unified_exec/process_manager.rs#L879)负责会话查找和交互；启动仍经过[[codex-sandbox-launch|执行与沙箱链路]]。等待输出的时间窗口与进程总运行时限是不同概念，不能将暂时返回理解为超时终止。

该版本的 `MAX_UNIFIED_EXEC_PROCESSES = 64` 是应用维护的进程会话上限，不是内核对子进程总数的限制。会话回收与[[sandbox-processes|后代进程清理]]也需分别核对，避免把会话记录删除当成整棵进程树已结束。

阅读范围：Codex `5ef96ab`，以下结论来自源码阅读，未在此运行沙箱。
