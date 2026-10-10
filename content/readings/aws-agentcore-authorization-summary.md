---
title: "AWS AgentCore：把身份与工具参数交给授权策略"
parent: tool-permissions
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Authorization flow](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/policy-authorization-flow.html)"
---

**网关把身份信息与本次工具调用组合成结构化授权请求，再由 Cedar 判断是否允许。** 原文展示的是 AgentCore Gateway 的具体映射。

## 请求如何转换？

- `principal`：来自 JWT 的 `sub`，其他身份声明作为实体标签参与条件判断。
- `action`：调用的工具名称。
- `resource`：当前 Gateway 实例。
- `context.input`：工具的实际参数，例如订单号、退款金额和原因。

注意，这个实现中 `resource` 是网关，订单信息放在上下文中；不能把通用授权模型与产品字段映射混为一谈。

## 退款例子说明什么？

原文同时检查主体、退款工具、网关、用户名和 `amount < 500`；示例金额为 450，满足全部条件后允许执行。因此，“能调用退款工具”还需要结合本次参数判断。

对自建执行器的借鉴是：从可信身份上下文取得调用者，再把工具和参数交给策略层；不要让模型自己填写一个身份来决定权限。这是工程推导，原文主要展示请求结构与策略求值，不覆盖完整业务授权。示例未运行。
