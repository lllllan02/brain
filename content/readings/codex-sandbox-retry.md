---
parent: codex-sandbox-overview
title: "Codex 遇到沙箱拒绝后如何决定重试"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: ["[`ToolOrchestrator` 的错误分支](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/tools/orchestrator.rs#L386)", "[重试后端选择](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/tools/orchestrator.rs#L517)"]
---

**Codex 将沙箱拒绝视为新的权限判断入口，而不是自动去掉沙箱再执行。**

## 拒绝后如何决定下一步

`ToolOrchestrator` 先区分普通程序失败与 `SandboxErr::Denied`。进入拒绝分支后，再检查是否允许升级、是否存在网络审批上下文、是否需要重新审批。

只有策略与审批允许时，才根据重新确定的权限和执行方式进行下一次尝试。它可能继续受限运行，也可能使用获准的更高权限；程序自身报错并不等于权限不足。

## 为什么不能只看 None

重试选择中还要区分执行器是否自行管理沙箱。`SandboxType::None` 可能仅表示当前这一层不再包装，不能据此断言最终进程没有隔离。

这份源码展示了[[sandbox-execution|审批与运行时限制]]的配合：先决定能否重试，再沿执行器核对实际边界。

阅读范围：Codex `5ef96ab` 固定版本源码；未运行验证。
