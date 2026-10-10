---
parent: codex-sandbox-overview
title: "Codex 如何把权限策略转换为平台沙箱"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: ["[管理器的 `transform`](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/sandboxing/src/manager.rs#L355)", "[Linux 后端](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/linux-sandbox/README.md#L1)"]
---

**Codex 先表达统一权限策略，再由平台后端转换成可执行的隔离配置；后端的能力和失败处理决定实际效果。**

管理器的 `transform` 组织命令、参数和执行环境：macOS 生成 Seatbelt 包装，Linux 使用专用 helper，Windows 区分原生受限执行与 MXC 等路径。

## Linux 后端如何组合机制

该版本以 bubblewrap 建立挂载与命名空间，让进程看到受限的文件和网络环境；再用 seccomp 补充系统调用限制。[[codex-sandbox-filesystem|敏感路径保护]]是在这种文件视图上进一步应用的策略。

旧 Landlock 路径不能视作等价回退。文件受限执行会拒绝使用它，原因包括无法隔离 app-server 的 Unix socket；“仍然有某种限制”不代表满足了原策略要求。

所以阅读源码时需要连续核对：请求了什么策略 → 实际选用哪个后端 → 后端不可用时是否拒绝或降级。不同系统的参数不能直接互相套用。

阅读范围：Codex `5ef96ab` 固定版本源码；未运行验证。
