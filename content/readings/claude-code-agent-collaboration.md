---
title: "Claude Code：子 Agent 与 Agent Teams"
parent: multi-agent
category: "Agent"
tags: ["Agent", "多Agent协作", "上下文管理"]
created_at: "2026-10-13T17:41:05+08:00"
updated_at: "2026-10-17T23:53:29+08:00"
source: ["https://code.claude.com/docs/en/sub-agents", "https://code.claude.com/docs/en/agent-teams"]
learning_status: pending
---

Claude Code 的子 Agent 适合有界、只需交回成果的工作；Agent Teams 适合成员需要持续讨论和协调的工作。以下节选官方文档的委派条件与触发方式，核对于 2026-10-17，未运行产品配置或对比实验。

## 何时委派，何时留在主会话？

[子 Agent 的使用建议](https://code.claude.com/docs/en/sub-agents#choose-between-subagents-and-main-conversation)给出三类场景：

- 大量中间输出：检索、测试或日志处理留在分支，只向主会话返回必要摘要。
- 专用工具与权限：让某项工作在指定的工具与权限配置下运行。
- 工作自包含：输入可交代清楚，结果能通过摘要交回，不需频繁来回沟通。

快速定点修改、频繁迭代、多阶段共享大量上下文，以及对子运行启动延迟敏感的工作，建议留在主会话。仅需复用提示或流程时，可用 Skills。文档也允许串行衔接子 Agent，因此委派不必以并行为前提；独立并行调查则要求各探索路径不互相依赖。

## 谁决定创建？

[自动委派](https://code.claude.com/docs/en/sub-agents#understand-automatic-delegation)由 Claude 结合用户任务、子 Agent 的 `description` 和当前上下文判断；用户也可显式请求。它是模型的委派选择，不是程序检测到“复杂任务”就固定启动若干成员。

内置 Explore 用于无需修改文件的代码搜索与理解；Plan 在规划模式中调查代码，保持主会话只读。自定义定义可放在 `.claude/agents/`，配置名称、描述、提示、模型、工具与权限；加载定义后，真正委派才启动运行。普通子 Agent 与继承主历史的 fork 不同，不能假定每次都从空历史开始。

## 何时改用团队？

[Agent Teams](https://code.claude.com/docs/en/agent-teams#compare-with-subagents)由 lead 协调独立 teammate，会话间可直接发消息，具备任务工具时可认领共享任务；命名子 Agent 也能发消息，差异不能仅看有无消息功能。官方建议用子 Agent 承接只需返回结果的聚焦工作，用团队支持互相质疑、交换发现和自主协调。

核对时 Teams 仍默认关闭且处于实验阶段，恢复和关闭存在限制；串行任务、同文件编辑和依赖密集的工作会增加协调成本。上述是官方使用建议与产品机制，不是同预算收益的实验结论。

[共享任务列表](https://code.claude.com/docs/en/agent-teams#assign-and-claim-tasks)记录待处理、处理中和已完成状态；未解除的依赖会阻止认领。lead 可指派，成员也可领取未分配且未阻塞的工作，认领时用文件锁避免竞争。它支持持续分配工作与追踪责任，消息仍负责交换任务记录之外的发现。
