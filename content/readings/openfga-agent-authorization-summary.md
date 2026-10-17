---
title: "OpenFGA：Agent 授权关系、条件与变更管理"
parent: tool-permissions
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10T20:24:03+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "[Dynamic Conditions](https://openfga.dev/blog/dynamic-abac-expressions-announcement)"
  - "[Get Started with Modeling](https://openfga.dev/docs/modeling/getting-started)"
  - "[Update Relationship Tuples](https://openfga.dev/docs/getting-started/update-tuples)"
  - "[Immutable Authorization Models](https://openfga.dev/docs/getting-started/immutable-models)"
  - "[Query Consistency Modes](https://openfga.dev/docs/interacting/consistency)"
---

**「OpenFGA 将授权模型、具体关系和调用条件分开：模型定义权限如何推导，关系记录谁获得了什么授权，条件限制本次使用。」** 本文节选官方文档中与 Agent 权限表达及变更管理有关的内容。

## 权限怎样授予与撤销？

模型可以定义「文档所有者也具有阅读权限」；关系元组则记录「Anne 是文档 Z 的所有者」。Check 根据模型与已有关系回答能否访问，避免把每个用户的授权写进模型。

Write API 用 `writes` 增加关系、用 `deletes` 删除关系。删除一条直接授权，只消除这一条依据；如果模型还能通过角色、组成员或其他关系推导权限，访问仍可能被允许。撤权后应检查实际决策，不能只确认删除成功。

官方建模流程用样例关系和允许／拒绝断言验证模型。它检查的是哪些访问应成立，而不只是模型语法是否正确。

## 用同一种模型表达不同限制

例子是允许某个 Agent 使用 Slack 发消息工具，但只允许发送到指定频道：

```text
关系：agent:alice-claude — can_call → tool:slack_send_message
条件：本次 channel == 授权配置中的 allowed_channel
```

**「关系授予调用能力，条件进一步限制本次请求」**。相同模式可用于租户、区域、资源属性和其他参数；网关在调用前提交实际上下文，执行授权判断。

## 动态条件解决什么维护问题？

普通 Conditions 需要在模型中声明条件及参数。新增限制可能要求修改模型；Dynamic Conditions 则把 CEL 表达式作为关系元组的数据保存，检查时使用请求上下文求值，使关系模型保持稳定。

表达式应通过可信管理入口配置，并限制配置权限、校验表达式；**「不能让 Agent 随请求任意提供自己的授权规则」**。

Dynamic Conditions 原文发表于 2026-09-21，明确为实验功能，语法与行为可能变化；「模型＋关系」不依赖采用这一实验能力。

## 规则变更何时生效？

**「授权模型不可原地修改」**，每次写入产生新版本。官方建议生产请求固定 `authorization_model_id`；不传时会使用 Store 最新创建的模型。固定版本可以先测试再切换，模型版本也不等于授权关系数据的历史快照。

关系变更还受查询缓存影响。启用缓存时，默认的 `MINIMIZE_LATENCY` 可能继续返回旧结果；`HIGHER_CONSISTENCY` 跳过缓存查询数据库，以延迟和性能换取更及时的判断。文档说明服务缓存默认关闭，不能把缓存延迟当作所有部署必然存在的问题。

上述内容按 2026-10-12 文档核对，未运行示例。OpenFGA 提供授权判断；谁能修改关系、如何审批和如何阻止实际执行，仍需应用接入相应管理与执行入口。
