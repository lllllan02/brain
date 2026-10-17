---
title: "企业 Agent 选型"
aliases: ["企业自建 Agent", "通用 Agent 与 MCP"]
parent: agent
category: "Agent"
tags: ["Agent", "MCP", "工程选型"]
learning_status: pending
created_at: "2026-10-17T10:41:54+08:00"
updated_at: "2026-10-17T10:41:54+08:00"
---

**企业应先验证「通用 Agent + MCP」，再按实际缺口决定是否自建，以及自建哪一层。**

按 [[mcp-architecture-summary|MCP 架构]]，协议统一外部能力的发现与调用，模型决策和上下文组织仍由宿主应用负责。MCP Server 可以封装审批、恢复甚至完整 Agent，但这些能力仍需实现，接入协议不会自动获得。

例如，员工查询客户、准备材料，可能只需接入企业数据与工具；无人值守的采购流程若缺少审批等待、故障恢复和防重复下单，就补业务服务或[[agent-vs-workflow|工作流]]，并优先复用现成能力。只有瓶颈落在现成平台无法调整的模型选择、上下文管理或执行控制上，才进一步考虑自建 [[agent-harness|Agent Harness]]。

判断依据是具体应用的能力缺口与建设成本；「需要开发业务能力」并不直接意味着「需要重写 Agent 运行系统」。
