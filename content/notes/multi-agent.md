---
title: "多 Agent 协作"
aliases: ["多智能体协作", "Multi-Agent Systems", "MAS"]
parent: agent
category: "Agent"
tags: ["Agent", "多Agent协作", "工程选型"]
learning_status: organized
created_at: "2026-10-13T17:41:05+08:00"
updated_at: "2026-10-18T00:17:52+08:00"
reading_suggestions:
  - agent-vs-workflow
  - langchain-multi-agent
  - a2a
  - agent-task-state
  - mast-multi-agent-failures
  - agent-evaluation
learning_status_changed_at: "2026-10-18T00:18:56.203+08:00"
---

**多 Agent 协作是让多个 Agent 分工执行，通过成果回传、交接或消息交换完成共同目标。**

需要并行推进独立分支，或隔离大量过程资料时，多 Agent 可以减少等待、减轻主上下文负担；代价是更多 Token 与协调成本。[[anthropic-multi-agent-research|Anthropic 的研究系统]]体现了这一取舍。

## 哪些工作值得独立委派？

[[agent-task-decomposition#怎么拆？|任务拆分]]确定结果与依赖，**多步骤不等于需要多个 Agent**。

[[claude-code-agent-collaboration#何时委派，何时留在主会话？|Claude Code]]建议委派可独立交付的工作；[[codex-subagents#源码怎样判断委派价值？|Codex 的 V1 源码指引]]强调不阻塞主 Agent 当前推进。

据此，**优先委派能独立交付的工作：目标和范围能讲清，执行中不必频繁确认，成果可以单独检查。** 尤其适合三种情况：委派后主 Agent 还能推进其他工作；中间资料很多，主 Agent 只需结论；需要单独限制工具或权限。下一步马上依赖结果的短任务、需要频繁沟通的工作，留在主 Agent。

![[assets/multi-agent-delegation.png|640]]

串行委派也能隔离上下文。仅需专业指令时可用 [[agent-loading|Skill]]，固定步骤可用[[agent-vs-workflow|工作流]]编排。

## 协作组织

**子 Agent 接受委派，运行自身模型与工具循环并返回成果。** 委派关系不要求换模型或新建进程。

[[langchain-multi-agent|任务调度]]决定控制权，成员协调决定怎样共享进展，两层可以组合。

![[assets/multi-agent-organization.png|680]]

### 任务调度：谁决定下一步？

- **主从委派**：分工需随中间结果调整，由主 Agent 持续统筹并汇总。
- **路由**：请求类别明确，分流到一个或多个相关专家，避免无关专家参与。
- **交接**：后续对话或阶段由另一角色接管，直接接续，减少转述。

### 成员协调：怎样交换进展？

- [[autogen-group-chat|群聊]]：需回应、质疑彼此发现时共享讨论，便于相互修正，但会增加消息与上下文。
- [[claude-code-agent-collaboration|共享任务]]：持续分配工作时记录依赖、负责人和进度，减少重复认领与遗漏。

## 调用与通信

- **工具调用**：将子 Agent 入口包装成工具，由调用方发出任务、收回成果。
- [[a2a|A2A]]：与独立 Agent 服务交换能力、任务、状态及产物。

A2A 客户端也可包装成工具；通信方式与协作组织分别选择。

## 工程问题怎么做？

1. **写清任务**：明确目标、范围、资料、权限、交付物和停止条件。
2. **启动并回收**：[[agent-harness|Harness]]组装上下文、启动子运行，保留标识以回收成果与证据，由主 Agent 核对后继续。
3. **管理状态与成本**：用[[agent-task-state|任务状态]]跟踪责任、依赖和结果，限制并发、嵌套与预算。超时先查进展，只重试安全步骤；取消后检查剩余分支，迟到结果核对版本。
4. **隔离并验收**：划分文件写入与权限边界，不能只隔离上下文；按证据和整体目标验收，意见一致不能替代验证。

排错按 [[mast-multi-agent-failures|MAST]]检查分工、信息传递和验收；用同批任务、相同预算[[agent-evaluation|评测]]质量、成本与延迟，判断协作是否值得。
