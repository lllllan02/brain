---
parent: history-storage
title: "OpenAI：用会话 ID 保存与读取历史"
category: "Agent"
tags: ["上下文管理", "持久化"]
created_at: "2026-10-11T21:36:25+08:00"
updated_at: "2026-10-11T21:36:25+08:00"
source:
  - "https://developers.openai.com/api/docs/guides/conversation-state"
  - "https://developers.openai.com/api/reference/resources/conversations/subresources/items/methods/list"
---

**Conversations API 将历史保存为有独立 ID 的服务端对象，Responses API 使用该 ID 延续交互。** 本文聚焦对话记录的托管与读取，依据 2026-10-11 官方文档。

## 保存和接续的对象

Conversation 内部保存 items，包括消息、工具调用和工具输出，不只是最终回答文字。后续请求传入 `conversation` ID，由服务端关联历史；应用仍需保存业务会话与这个 ID 的对应关系。

自行管理历史时，则由应用保留响应输出项，再与新输入组合。两种方式的主要差别是历史由谁保存和装配，不能从「传一个 ID」推断模型无需处理历史。

## 读取与保留期限

会话 items 有独立的列表接口，支持分页和排序。需要导出或展示完整历史时，应遍历分页，按所需顺序组织记录。

普通 Response 对象默认保存 30 天；Conversation 及其 items 不适用这个 30 天 TTL。`previous_response_id` 是串联响应的另一种方式，不应与持久会话 ID 混用概念。

托管保存仍受模型窗口限制；使用响应链时，历史输入仍计入输入 Token 费用。文档说明的是 API 行为，未说明服务端使用哪种数据库。
