---
title: "OWASP：审批应绑定具体操作"
parent: tool-permissions
category: "Agent"
tags: ["Agent", "工具调用", "权限"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Transaction Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html)"
---

**批准应对应用户确认的关键操作数据，最终执行不能偷偷换成另一项操作。** 原文以交易授权为背景，重点是防止审批被篡改、跳过或重放。

## 用户到底确认什么？

展示足以判断操作的重要信息，例如转账对象和金额。服务端保存并校验这些数据，控制状态转换顺序；关键数据改变时，应使旧授权失效或重新开始授权流程。

## 执行前还要检查什么？

最终执行设置检查点，确认这项操作已经正确授权；授权凭据限制有效时间，并按操作区分，防止重复使用。仅在前端展示确认框不足以落实这些保证。

借鉴到 Agent：删除文件应确认目标，发送消息应确认收件人与内容；修改这些关键参数后不能直接沿用旧批准。这是迁移到工具审批的设计解释。

原文没有要求所有操作一律审批；哪些操作需要授权确认，应按具体风险与已有控制决定。重点可读原文 1.1、2.5–2.10 节。
