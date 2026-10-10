---
title: "工具调用的权限与审批"
parent: tool-calling
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**权限与审批关注一次工具调用是否获准、是否需要人确认，以及批准后如何继续执行。** 执行环境的隔离机制由[[agent-sandbox|沙箱专题]]展开，两者在[[sandbox-execution|调用链中的衔接]]另有说明。

从通用原则到具体实现，可按以下顺序阅读：

1. [[owasp-authorization-summary|OWASP 授权原则]]：检查谁能对哪些资源执行什么操作。
2. [[owasp-transaction-authorization-summary|OWASP 操作审批]]：批准如何绑定关键参数，如何防止篡改、跳过与重放。
3. [[claude-permissions-summary|Claude 权限规则]]：允许、拒绝、询问和回调按什么顺序生效。
4. [[openai-guardrails-summary|OpenAI 检查与审批]]：如何暂停、限定批准范围、保存状态并恢复。
5. [[aws-agentcore-authorization-summary|AWS 参数级授权]]：如何把可信身份、工具与参数转成策略输入。
