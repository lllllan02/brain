---
title: "Permit：Agent 授权与审批如何组合"
parent: tool-permissions
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10T20:24:03+08:00"
updated_at: "2026-10-10T20:24:03+08:00"
source:
  - "[Human-in-the-Loop Approvals](https://docs.permit.io/permit-mcp-gateway/human-in-the-loop/)"
  - "[Access Request MCP overview](https://docs.permit.io/ai-security/access-request-mcp/overview/)"
---

**Permit 将调用授权与审批组织为两个关口，并区分申请访问权限和确认一次操作。** 两篇文档分别展示网关统一拦截与应用接入审批工具的方式。

## 网关怎样统一处理？

Agent 调用 MCP 工具 → 网关检查授权 → 检查审批规则 → 直接执行或暂停 → 批准后执行，拒绝或超时则返回错误。

审批可按单个工具、整个 Server 或工具等级配置；任一条件要求审批就暂停。产品还提供按 Agent 配置的审批跳过项，其优先于该 Server 的审批规则；这是跳过审批，不应理解为自动获得所有业务权限。

审批展示工具与服务、Agent 和用户身份、实际参数及剩余时间，决定由管理员作出。文档中的网关 HITL 属于企业版能力。

## 申请权限和操作批准有何区别？

Access Request MCP 的访问申请获批后，会给用户分配资源上的角色，后续权限检查据此放行。

操作批准则由资源上的 Reviewer 审核，获批后授予 Approved 角色及 operate 权限，工具执行前再检查。文档通过成功后撤销角色实现一次性使用；它没有在此说明并发下的原子消费保证，实现时不能仅凭「成功后撤销」推断已避免重复执行。

这组资料适合参考共享审批规则、规则组合和批准的作用范围。上述产品机制按 2026-10-10 文档整理，未运行示例。
