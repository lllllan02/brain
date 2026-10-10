---
parent: codex-sandbox-overview
title: "Codex 如何把工具命令送进沙箱"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**Codex 把工具参数、审批决策和平台沙箱分在不同层处理。** 追踪一次命令时，应找到最终执行器，不能只看工具入口。

1. `exec_command` 解析命令、执行目录和权限参数，构造执行请求。
2. `ToolOrchestrator` 组织审批与尝试；运行时准备实际执行环境。
3. 本地执行路径由沙箱管理器把权限策略转换成平台启动方式，再创建进程。

[工具入口](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/tools/handlers/unified_exec/exec_command.rs#L231)、[持续执行运行时](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/tools/runtimes/unified_exec.rs#L654)和[沙箱管理器](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/sandboxing/src/manager.rs#L355)分别对应这些职责。远程执行路径还需追到服务端，客户端未包一层本机沙箱不意味着远端没有隔离。

[[codex-sandbox-platforms|平台转换]]解释同一策略如何落地；[[codex-sandbox-retry|拒绝与重试]]解释失败后如何改变下一次尝试。两者共同实现[[sandbox-execution|权限检查与执行流程]]。

阅读范围：Codex `5ef96ab`，以下结论来自源码阅读，未在此运行沙箱。
