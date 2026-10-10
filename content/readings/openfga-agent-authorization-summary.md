---
title: "OpenFGA：Agent 授权关系与动态条件"
parent: tool-permission-design
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10T20:24:03+08:00"
updated_at: "2026-10-10T20:24:03+08:00"
source:
  - "[Dynamic Conditions](https://openfga.dev/blog/dynamic-abac-expressions-announcement)"
---

**将「Agent 可以调用哪个工具」保存为授权关系，将「这次调用满足什么限制」表达为条件。** 原文针对 MCP 工具和运行时限制不断变化的场景。

## 用同一种模型表达不同限制

例子是允许某个 Agent 使用 Slack 发消息工具，但只允许发送到指定频道：

```text
关系：agent:alice-claude — can_call → tool:slack_send_message
条件：本次 channel == 授权配置中的 allowed_channel
```

关系授予调用能力，条件进一步限制本次请求。相同模式可用于租户、区域、资源属性和其他参数；网关在调用前提交实际上下文，执行授权判断。

## 动态条件解决什么维护问题？

普通 Conditions 需要在模型中声明条件及参数。新增限制可能要求修改模型；Dynamic Conditions 则把 CEL 表达式作为关系元组的数据保存，检查时使用请求上下文求值，使关系模型保持稳定。

表达式应通过可信管理入口配置，并限制配置权限、校验表达式；不能让 Agent 随请求任意提供自己的授权规则。

原文发表于 2026-09-21，Dynamic Conditions 明确为实验功能，语法与行为可能变化。本文借鉴其「关系＋条件」的设计，不将其视为成熟稳定接口；示例未运行，也未涵盖完整审批流程。
