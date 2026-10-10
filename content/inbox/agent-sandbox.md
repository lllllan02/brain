---
parent: agent-capabilities
title: "Agent 沙箱（Sandbox）"
category: "Agent"
tags: ["Agent", "沙箱"]
aliases: ["Sandbox", "沙箱"]
created_at: "2026-10-09"
updated_at: "2026-10-10T21:10:22+08:00"
---

**沙箱（Sandbox）是限制程序访问范围和资源用量的执行环境。** 让 Agent 修改项目、运行测试时，需要给它完成任务的能力，同时限制误操作和不可信代码的影响。

## 需要解决什么，怎么解决

1. **别动到无关文件。** 用[[sandbox-filesystem|文件边界]]只暴露必要目录，区分只读输入和可写输出。
2. **能读不代表能外传。** 用[[sandbox-network|网络边界]]关闭外网或限制出口；调用 API 时，用[[sandbox-credentials|凭据代理]]完成认证，真实密钥留在沙箱外。
3. **权限有限，资源仍可能耗尽。** 设置[[sandbox-resources|资源限额与超时]]，多任务再加[[sandbox-concurrency|整体并发控制]]。
4. **命令结束，残留未必消失。** 通过[[sandbox-lifecycle|生命周期]]决定环境共享、复用与回收，让[[sandbox-processes|子进程]]一起受限、一起清理。
5. **规则要落到执行上。** [[sandbox-execution|权限检查与沙箱执行]]分别决定是否允许操作、获准后能做什么；各工具是否进入同一边界需单独确认。
6. **配置存在不等于有效。** 用[[sandbox-verification|成功与拒绝的对照测试]]验证限制；沙箱内的合法修改仍需业务测试与审查。

## 实现与选型

[[sandbox-implementations|实现方案与权衡]]比较本机命令限制、容器、gVisor、microVM 与托管产品，并连接各方案的用法。选择时核对隔离范围、环境兼容性与维护成本，不能只按产品名称判断安全性。

[[sandbox-projects|实际 Agent 的方案对照]]按运行路径比较项目；继续追踪实现时，[[codex-sandbox-overview|Codex 源码]]展示策略如何进入执行器，[[claude-sandbox-overview|Claude Code 公开运行时]]展示命令包装与网络代理如何配合。
