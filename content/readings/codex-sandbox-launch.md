---
parent: codex-sandbox-overview
title: "Codex 如何把工具命令送进沙箱"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: ["[工具入口](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs#L231)", "[持续执行运行时](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/tools/runtimes/unified_exec.rs#L654)", "[沙箱管理器](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/sandboxing/src/manager.rs#L355)"]
---

**Codex 把命令解析、审批决策和平台隔离分层处理，只有追到最终执行器，才能确认限制在哪里生效。**

## 从工具请求到进程

1. `exec_command` 解析命令、工作目录和权限参数，形成执行请求。
2. `ToolOrchestrator` 组织审批与执行尝试，运行时准备实际环境。
3. 本地沙箱管理器把权限策略转换为平台启动方式，再创建进程。

因此，工具参数表达请求，审批确定允许范围，平台后端落实限制；这些职责不能仅凭某一个工具函数判断。

## 本地与远程怎样核对

本地路径可继续看[[codex-sandbox-platforms|平台策略转换]]。远程路径则需追到服务端：客户端没有包装本机沙箱，不能推出远程执行没有隔离。

执行失败后由[[codex-sandbox-retry|拒绝与重试逻辑]]决定是否需要新的权限判断，以及下一次尝试使用什么方式；重试不是任意放宽边界的通道。

阅读范围：Codex `5ef96ab` 固定版本源码；未运行验证。
