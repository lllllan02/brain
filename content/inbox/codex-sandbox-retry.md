---
parent: codex-sandbox-overview
title: "Codex 遇到沙箱拒绝后如何决定重试"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**沙箱拒绝只触发一次新的权限决策，不自动赋予沙箱外执行权限。**

[`ToolOrchestrator` 的错误分支](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/tools/orchestrator.rs#L386)区分普通执行失败与 `SandboxErr::Denied`。进入拒绝分支后，它再检查是否允许升级、是否存在网络审批上下文，以及是否需要重新审批。

允许重试时，下一次尝试使用重新确定的权限和执行方式。它可能继续受限执行，也可能按批准范围请求更高权限；不能把全部重试概括为「去掉沙箱再跑一次」。

[重试后端选择](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/tools/orchestrator.rs#L517)还区分执行器是否自行管理进程沙箱。因此这里的 `SandboxType::None` 只说明本层不再包装，判断最终边界仍需追到实际执行器。

这条分支用于理解[[sandbox-execution|审批与运行时限制]]如何配合；普通程序报错与边界拒绝应分别处理。

阅读范围：Codex `5ef96ab`，以下结论来自源码阅读，未在此运行沙箱。
