---
learning_status: understood
title: "工具调用的权限"
parent: tool-calling
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10"
updated_at: "2026-10-17T15:08:33+08:00"
reading_suggestions:
  - tool-approvals
  - openfga-agent-authorization-summary
  - aws-agentcore-authorization-summary
  - claude-permissions-summary
  - sandbox-execution
---

**工具调用的权限（Tool Permissions）限制 Agent 的操作范围，由程序判断调用应放行、拒绝还是审批。**

![[assets/tool-permission-overview.png|工具权限逐层判断：分类、授权、审批与执行前复核]]

## 1. 先按影响确定检查深度

按[[tool-interface-design|实际能力]]粗分：纯计算 → 读取 → 新增/修改 → 删除、对外操作（非固定风险排序）；Shell/脚本可涵盖多种影响，各类工具都只开放[[owasp-agent-boundaries-summary|任务所需能力]]。

## 2. 简单工具可以默认执行

不访问受保护资源、无外部副作用的纯计算工具，可预先允许，无需逐次检查资源权限；仍校验参数格式、输入大小与运行额度。

参数能指定文件、网络地址或命令时，须检查实际访问能力。

## 3. 涉及资源时，再识别目标并检查两层权限

从可信系统取得身份与对象归属，按实际动作、目标及完整批量范围检查：

1. 用户权限：被代表用户有权操作哪些资源，由资源或系统负责人制定。
2. Agent 授权：当前任务委托的动作、对象、期限与额度，由有权者授予，应用保存。

**「当前可操作范围 = 用户权限 ∩ Agent 当前授权范围」。**

![[assets/tool-permission-intersection.png|用户权限与 Agent 当前授权必须同时成立，只有交集属于可操作范围]]

交集仍受系统禁止项与环境限制约束，不能通过子 Agent 或替代工具扩权。规则用主体、动作、资源与条件表达。

## 4. 在允许范围内，再决定是否需要审批

越权或命中禁止项则拒绝；授权内符合自动执行条件则放行，规则要求确认则审批。

负责人按敏感程度、可恢复性、影响范围与费用制定确认条件；低影响、易恢复的操作可预先授权，高影响或不可逆的操作通常保留审核。

身份或目标不明先核实，无允许依据不执行。扩权须走[[tool-approvals|授权申请]]后重判，普通确认不能覆盖禁止项。

## 5. 把各层判断接入执行入口

在[[tool-registry|注册表]]关联分类与检查逻辑。

- 检查覆盖全部入口：包括自动放行路径，不能只放在[[claude-permissions-summary|审批回调]]中。
- 资源服务复核权限、目标与批准范围：防止批量、并发和重试绕过限制；通用执行另受[[sandbox-execution|环境限制]]约束。
- 可信入口维护规则与授权：分开保存，撤权处理缓存；先用代码与配置，关系复杂后再考虑[[openfga-agent-authorization-summary|授权引擎]]。

测试覆盖放行、拒绝、审批、越权、过期与参数替换，核对实际动作；[[aws-agentcore-authorization-summary#配置了规则，是否就会拦截？|记录拒绝]]不等于阻止执行。
