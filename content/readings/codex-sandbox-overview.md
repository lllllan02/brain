---
parent: agent-sandbox
title: "Codex 沙箱源码阅读入口"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**这组源码导读追踪 Codex 的工具请求如何经过审批、进入平台沙箱，并在持续运行与失败重试时维持边界。** 阅读范围为 `5ef96ab` 固定版本，各篇提供源码定位；未运行验证。

## 先建立执行主线

1. [[codex-sandbox-launch|命令进入沙箱]]：工具参数、审批组织、运行时与最终执行器怎样分工。
2. [[codex-sandbox-platforms|平台策略转换]]：同一策略怎样落到不同后端，为什么回退方案不能只看名称。

## 再按边界追踪

- [[codex-sandbox-filesystem|文件保护]]：工作区可写时，如何继续限制敏感子路径与文件工具入口。
- [[codex-credential-broker|凭据代理]]：子进程使用占位值时，可信目标怎样得到真实凭据。
- [[codex-exec-session|持续执行会话]]：工具返回后进程怎样继续运行，会话回收与后代清理为何不同。
- [[codex-sandbox-retry|拒绝与重试]]：拒绝后怎样重新决定权限，为什么不能把重试理解成自动解除沙箱。

最后看[[codex-sandbox-tests|边界测试]]：怎样用允许行为作对照，并检查文件状态和后代进程，而不只断言返回错误。

通用问题见[[agent-sandbox|沙箱专题主线]]；需要创建环境时看[[sandbox-implementations|实现方案与用法]]。
