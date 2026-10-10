---
parent: codex-sandbox-overview
title: "Codex 如何让长命令跨工具调用持续运行"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: ["[`unified_exec`](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/unified_exec/mod.rs#L1)", "[进程管理器](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/unified_exec/process_manager.rs#L879)"]
---

**Codex 的执行会话保存仍在运行的进程，使长命令能跨多次工具调用持续交互。**

## 工具返回后发生什么

`exec_command` 启动进程，在等待窗口内读取输出；若尚未退出，就返回会话标识。后续 `write_stdin` 根据标识找到原进程，写入输入并读取新输出。shell 状态随该进程保留，而不是每次创建一个全新 shell。

启动仍经过[[codex-sandbox-launch|审批与沙箱链路]]；会话只改变交互方式，不自动改变权限。

## 三种“结束”不能混淆

一次等待窗口结束，不等于进程超时；工具暂时返回，也不等于进程退出。会话记录回收则还需要与[[sandbox-processes|后代进程清理]]分别核对，不能把删除记录视为整棵进程树已经停止。

该版本最多维护 64 个 Unified Exec 进程会话，这属于应用层会话上限，不是内核对子进程总数的限制。

阅读范围：Codex `5ef96ab` 固定版本源码；未运行验证。
