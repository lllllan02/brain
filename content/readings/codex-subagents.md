---
title: "Codex：何时委派子 Agent"
aliases: ["Codex Subagents", "Codex 子 Agent"]
parent: multi-agent
category: "Agent"
tags: ["Agent", "多Agent协作", "工程选型"]
learning_status: pending
created_at: "2026-10-17T23:24:09+08:00"
updated_at: "2026-10-17T23:24:09+08:00"
source: ["https://learn.chatgpt.com/docs/agent-configuration/subagents", "https://github.com/openai/codex/blob/ce0323f2f2d3b25e82806cd555237da3db4e1897/codex-rs/core/src/tools/handlers/multi_agents_spec.rs", "https://github.com/openai/codex/blob/ce0323f2f2d3b25e82806cd555237da3db4e1897/codex-rs/core/src/tools/handlers/multi_agents/spawn.rs", "https://github.com/openai/codex/blob/ce0323f2f2d3b25e82806cd555237da3db4e1897/codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs"]
---

Codex 的官方文档强调上下文隔离和独立并行工作；公开源码中的一组委派指引进一步要求主 Agent 保持当前关键工作推进。本文节选相关文档与创建入口，核对于 2026-10-17，源码固定在提交 `ce0323f`，未运行产品行为或性能对比。

## 官方文档建议什么？

[Subagents 文档](https://learn.chatgpt.com/docs/agent-configuration/subagents#why-subagent-workflows-help)建议把探索、测试、日志分析等大量中间输出放到分支，只返回摘要，让主会话保留要求、决定和最终成果。独立分支可并行减少等待；并行修改则需谨慎，多个 Agent 编辑代码会带来冲突与协调成本。每个分支仍消耗自己的模型与工具资源。

## 源码怎样判断委派价值？

[`spawn_agent_tool_description`](https://github.com/openai/codex/blob/ce0323f2f2d3b25e82806cd555237da3db4e1897/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L738-L768)的 V1 回退文案要求先区分立即阻塞主任务的工作与可同时推进的分支：

- 主 Agent 保留紧急、耦合紧密或下一步立即依赖的工作，避免委派后只能等待。
- 优先委派问题清楚、有界、能独立完成的分支；主 Agent 同时推进不重叠的工作，不重复调查。
- 编码分支划分不重叠的写入范围；验证只有能与实现重叠、并有望发现具体风险时才委派。

这是给模型的策略提示，不是自动判定器。该函数允许 `usage_hint_text` 替换回退文案；同文件的 [V2 构造函数](https://github.com/openai/codex/blob/ce0323f2f2d3b25e82806cd555237da3db4e1897/codex-rs/core/src/tools/handlers/multi_agents_spec.rs#L772-L820)使用另一套说明，不能把上述策略泛化为所有客户端、模型或会话的默认行为。

## 什么时候真正创建？

当前[官方触发说明](https://learn.chatgpt.com/docs/agent-configuration/subagents#triggering-subagent-workflows)要求本地 Codex 用户直接提出委派，或由适用的 AGENTS.md／Skill 要求；启用工具本身不等于会创建分支。

收到模型的 `spawn_agent` 调用后，[V1 handler](https://github.com/openai/codex/blob/ce0323f2f2d3b25e82806cd555237da3db4e1897/codex-rs/core/src/tools/handlers/multi_agents/spawn.rs#L53-L130)解析任务、检查嵌套深度、准备子配置并交给运行服务；[V2 handler](https://github.com/openai/codex/blob/ce0323f2f2d3b25e82806cd555237da3db4e1897/codex-rs/core/src/tools/handlers/multi_agents_v2/spawn.rs#L94-L135)也从工具请求进入创建流程。所查入口没有按任务步数自动增员的判断。公开文档与源码说明接口和指令，不能据此证明每次实际运行都会正确选择委派。
