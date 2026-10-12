---
title: "AWS AgentCore：把身份与工具参数交给授权策略"
parent: tool-permission-design
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10"
updated_at: "2026-10-12T12:34:08+08:00"
source:
  - "[Secure AI agents with Policy in Amazon Bedrock AgentCore](https://aws.amazon.com/blogs/machine-learning/secure-ai-agents-with-policy-in-amazon-bedrock-agentcore/)"
  - "[Authorization flow](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-authorization-flow.html)"
  - "[Policy scope](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-scope.html)"
  - "[Policy conditions](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-conditions.html)"
  - "[Policy enforcement modes](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-enforcement-modes.html)"
  - "[Test a policy in LOG_ONLY mode](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-test-a-policy.html)"
---

**网关把身份信息与本次工具调用组合成结构化授权请求，再由 Cedar 判断是否允许。** 本文聚焦 AgentCore Gateway 的 OAuth 身份映射、规则组合与执行模式；不覆盖全部策略能力。

## 请求如何转换？

- `principal`：来自 JWT 的 `sub`，其他身份声明作为实体标签参与条件判断。
- `action`：调用的工具名称。
- `resource`：当前 Gateway 实例。
- `context.input`：工具的实际参数，例如订单号、退款金额和原因。

注意，这个实现中 `resource` 是网关，订单信息放在上下文中；不能把通用授权模型与产品字段映射混为一谈。

## 工具多时，规则怎样组织？

MCP 工具使用 `<TargetName>___<ToolName>` 标识，避免不同接入目标的同名工具混淆。策略可以精确指定一个工具、列出多个动作，或通过 Target 动作组覆盖一组工具；这里的动作名称不支持任意通配匹配。

规则由作用范围和条件组成：先限定主体、动作与网关，再用 `when`／`unless` 检查身份属性和 `context.input` 中的参数，条件可通过与、或、非组合。工具分组减少重复规则，具体参数仍需逐次判断。

## 共享策略怎样决定调用结果？

医疗 Agent 案例中，同一个 `getPatient` 工具统一检查角色为 patient，且请求参数中的患者 ID 与可信身份中的患者 ID 一致：查询自己允许，查询别人拒绝。模型和工具代码不变，决策由网关中的策略完成。

策略集合采用默认拒绝：没有匹配的 permit 就不允许；匹配的 forbid 优先于 permit。公共允许规则与针对特定资源或操作的禁止规则可以组合，不必在各工具内部重复角色判断。

退款例子则用身份属性与 `context.input.amount < 500` 共同限制调用。这里的金额条件是授权条件，不自动产生审批流程；需要人工审批时还要另行编排。

## 配置了规则，是否就会拦截？

网关关联策略引擎后，还要选择执行模式：`ENFORCE` 按决策允许或拒绝；`LOG_ONLY` 只记录决策，不据此拦截调用。因此，日志里出现 Deny 不等于操作已被阻止，也不适合直接在需要保护的真实操作上试验拒绝规则。

单条策略另有 `ACTIVE`／`LOG_ONLY` 状态：仅 `ACTIVE` 策略参与实际允许／拒绝判定，观察中的策略只产生日志与指标。可以保留已有防护，观察新策略的判断，再将其转为生效状态；这与把整个引擎切到观察模式不同。

`bedrock-agentcore:UpdateGateway` 能切换网关模式，甚至移除策略引擎。官方要求只授予可信主体：管理执行配置的权限，本身也是权限边界的一部分。

可借鉴的是统一请求、集中策略、明确的组合语义和可验证的发布过程；业务资源属性仍需由可信系统提供。以上按 2026-10-12 官方文档核对，未实际运行。
