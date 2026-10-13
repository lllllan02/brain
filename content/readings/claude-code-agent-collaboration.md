---
title: "Claude Code：子 Agent 与 Agent Teams"
parent: multi-agent
category: "Agent"
tags: ["Agent", "多Agent协作", "上下文管理"]
created_at: "2026-10-13T17:41:05+08:00"
updated_at: "2026-10-13T17:41:05+08:00"
source: ["https://code.claude.com/docs/en/sub-agents", "https://code.claude.com/docs/en/agent-teams"]
read: false
---

**「子 Agent 适合有界委派，Agent Teams 为独立会话提供更直接的协作。」** 本文节选 2026-10-13 官方滚动文档，说明产品如何实现两种组织方式，未运行配置。

## 定义与启动是两件事

[Subagents 文档](https://code.claude.com/docs/en/sub-agents)用名称、描述、提示词、工具与权限等配置定义专业助手；项目定义可存于 `.claude/agents/`，也可通过启动参数临时提供。加载定义使能力可被选择，实际委派后才开始对应运行。

子 Agent 有自己的上下文窗口，可以承接大量日志或检索，再返回摘要。减少的是主上下文中的噪声，子 Agent 本身仍消耗 Token。当前文档还提供继承对话的 fork 方式，不能把所有子 Agent 一概理解为从空历史开始。

嵌套委派受工具权限与最大深度限制。文档记录多个版本曾改变默认深度，因此应按安装版本核对，不能沿用「子 Agent 永远不能再创建子 Agent」的旧结论。

## 团队增加了哪些协调能力？

[Agent Teams 文档](https://code.claude.com/docs/en/agent-teams)描述一个 lead 与多个独立 teammate 会话：成员可以交换消息，并在具备相应工具时通过共享任务列表分配或认领工作。当前子 Agent 文档也有命名后的消息能力，因此「能互相发消息」并非团队模式独有的判断标准。

文档建议将独立模块、不同审查角度或竞争性故障假设分开；同文件编辑、串行任务和依赖密集的工作会增加协调成本。多个上下文各自消耗资源，创建团队不能自动带来收益。

核对时 Agent Teams 仍标为实验功能，恢复、任务协调和关闭存在限制。本文保留架构对比，不把产品功能名称或当前限制推广为所有多 Agent 系统的共同规则。
