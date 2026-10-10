---
parent: agent-sandbox
title: "实际 Agent 如何组织沙箱"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**同一个 Agent 可以支持多种执行方式，比较方案时应先确定「命令在哪里运行」。** 以下是项目公开说明中的代表性路径，取舍属于架构分析。

| 项目与范围 | 执行方式 | 主要取舍 |
| --- | --- | --- |
| Codex 本地执行 | 由平台原生机制约束工具进程 | 沿用本地环境方便；需处理平台能力差异。[官方说明](https://learn.chatgpt.com/docs/sandboxing) |
| Claude Code Bash 沙箱 | 系统文件隔离配合受控网络代理 | 无需完整容器环境；需明确哪些工具进入边界及哪些通道例外。[官方说明](https://code.claude.com/docs/en/sandboxing) |
| Gemini CLI | 可选 Seatbelt、Docker／Podman、gVisor／runsc 等 | 可按环境选择；不同后端的默认权限与兼容性需要分别核对。[后端说明](https://geminicli.com/docs/cli/sandbox/) |
| OpenHands 远程工作区 | Agent Server 在 Docker、Kubernetes 等工作区中执行，也支持本地工作区 | 便于独立部署执行环境；需管理镜像、通信与回收。[SDK](https://github.com/OpenHands/software-agent-sdk) |
| [[e2b-sandbox-practice\|E2B 执行基础设施]] | Firecracker microVM，通过预启动快照创建环境并支持暂停恢复 | 独立客户内核与环境恢复能力；需承担托管或自建基础设施成本。[架构](https://github.com/e2b-dev/runtime/blob/main/docs/ARCHITECTURE.md) |

[[sandbox-implementations|隔离机制]]可以组合，但一个项目的某条路径不能代表全部运行方式。[[codex-sandbox-launch|Codex 命令链路]]和[[claude-sandbox-wrapper|Claude 运行时包装]]可用于进一步学习；[[claude-sandbox-devcontainer|Claude 的 devcontainer]]则展示了另一种边界范围。
