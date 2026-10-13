---
title: "Anthropic：用分类提示与结构化输出处理用户请求"
category: "Agent"
tags: ["Agent", "意图识别", "工具调用"]
created_at: "2026-10-13T17:38:39+08:00"
updated_at: "2026-10-13T17:38:39+08:00"
source:
  - "[Ticket routing](https://platform.claude.com/docs/en/about-claude/use-case-guides/ticket-routing)"
  - "[Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)"
  - "[Tool use with Claude](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)"
read: false
---

**「类别定义告诉模型如何判断，输出约束让程序能够读取，执行仍由工具所属的运行环境完成。」** 本文节选三份官方文档的分类实现、结构约束与工具分工，依据 2026-10-13 页面；不覆盖模型选型和完整 SDK 用法，未运行示例。

## 分类提示包含什么？

Ticket routing 的做法是先明确客服分类边界，再向模型提供角色、允许的类别、工单正文、输出格式与输入输出示例。示例用 `Order Tracking` 和 `Refund/Exchange` 等标签；程序发起一次模型请求，再从响应中提取标签交给路由逻辑。示例只选一个主要意图，不能直接当成保留全部任务的方案。

原文建议用带正确标签的测试集检查准确率，并记录成本与延迟；错误样本可以补成提示中的边界示例，例如间接表达和情绪干扰。类别增多时，可分层分类或检索相关示例，但前者会增加调用延迟。页面的目标数值与方案收益属于其示例语境，不能直接视为自己业务的效果。

## 输出怎样变得可解析？

Structured outputs 让调用方传入 JSON Schema，服务将结构转换为约束生成的语法。JSON 输出约束响应字段；严格工具调用约束工具名称与参数。这解决字段缺失、类型和语法问题，普通提示「请返回 JSON」没有相同保证。

页面同时列出拒绝、输出截断等例外；当时还说明枚举大小写可能不一致。因此应用仍须检查响应状态、解析并校验结果，不能把 HTTP 成功视为获得完整业务对象。

## 工具选择怎样连接执行？

Tool use 文档说明，模型依据请求和工具描述决定调用，并返回结构化调用。客户端工具由应用执行，服务端工具由 Anthropic 执行。自有订单业务属于前者：工具定义与模型输出不会自动完成退款，应用必须提供实际执行入口。

由这些机制可推导：**「字段符合结构，不等于选对意图或操作对象。」** Schema 可以约束订单号是字符串，却不能单凭这一约束证明它来自当前用户、确实存在或允许退款；这些判断仍需业务校验和实际样本评测。
