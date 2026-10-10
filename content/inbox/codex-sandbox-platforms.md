---
parent: codex-sandbox-overview
title: "Codex 如何把权限策略转换为平台沙箱"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**统一的权限策略需要由不同后端落实，不能把某个平台的参数当成通用机制。**

[管理器的 `transform`](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/sandboxing/src/manager.rs#L355)根据后端组织命令、参数与执行环境：macOS 路径生成 Seatbelt 启动配置；Linux 路径交给专用 helper；Windows 还需区分原生受限执行与 MXC 等路径。

在这个版本的 [Linux 后端](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/linux-sandbox/README.md#L1)中，bubblewrap 负责挂载和 namespace，seccomp 补充系统调用限制。旧 Landlock 路径不能简单视为等价回退：文件受限执行会拒绝使用它，原因包括无法隔离 app-server 的 Unix socket。

因此核对实现需要同时问：策略是什么、实际选了哪个后端、后端不可用时如何处理。[[sandbox-implementations|机制对比]]只解释能力类别；[[codex-sandbox-filesystem|文件保护规则]]展示其中一项策略的具体转换。

阅读范围：Codex `5ef96ab`，以下结论来自源码阅读，未在此运行沙箱。
