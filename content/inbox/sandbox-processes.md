---
parent: agent-sandbox
title: "沙箱如何约束和清理子进程"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**清理任务不能只停止最初那条命令，因为它可能启动了后台服务和更多子进程。** 例如测试脚本退出后，HTTP 服务仍可能占用端口、内存并继续写文件。

| 任务处于什么状态 | 应怎样管理后代进程 |
| --- | --- |
| 正常执行中 | 在受限环境内启动，让后代继续受文件、网络等限制 |
| 完成、取消或超时 | 停止整个任务的进程范围，而不只停止父进程 |
| 需要跨调用保留服务 | 记录服务归属、资源额度与结束条件，之后由执行器回收 |
| 执行器崩溃或断连 | 由外部管理器按任务存活规则检查和回收，不能依赖正常退出代码 |

因此要在启动时把进程放入可统一管理的范围，如任务专用容器或 cgroup。回收顺序是：**通知退出 → 等待清理 → 强制终止残留 → 确认结束**。普通进程组也能批量通知，但程序脱离该组后可能遗漏。

例如 systemd 的 `KillMode=control-group` 可处理服务所属控制组；限制继承则要分别核对后端，Linux seccomp 过滤会随允许的进程创建与执行继续生效。[停止行为](https://github.com/systemd/systemd/blob/main/man/systemd.kill.xml)、[限制继承](https://docs.kernel.org/userspace-api/seccomp_filter.html)

[[codex-exec-session|持续执行会话]]展示保留进程的用途，[[sandbox-lifecycle|生命周期]]决定何时关闭。验收时实际检查后代是否消失，不能只看“已取消”；[Codex 超时测试](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/core/src/exec_tests.rs#L1383)检查了孙进程退出。
