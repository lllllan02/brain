---
title: "Claude：上下文窗口与 Token 计数"
aliases: ["Context windows", "Token counting"]
parent: context-budget
category: "Agent"
tags: ["上下文管理"]
created_at: "2026-10-11T17:54:40+08:00"
updated_at: "2026-10-11T17:54:40+08:00"
source:
  - "https://platform.claude.com/docs/en/build-with-claude/context-windows"
  - "https://platform.claude.com/docs/en/build-with-claude/token-counting"
---

**Claude 的窗口同时容纳输入与本轮输出；请求前计数帮助安排容量，响应中的 usage 用于核对实际消耗。** 本文节选官方文档中与预算有关的规则，依据 2026-10-11 页面，未调用 API 验证，不枚举各模型的容量和价格。

## 哪些内容占窗口？

系统提示、历史消息、工具定义与结果、图片和文档都要计入；本轮生成的文本与 thinking 也占空间。缓存只改变处理成本，命中的前缀仍占窗口。读取 usage 时，不能只看未缓存输入，还要按接口口径纳入缓存读取和写入部分。

thinking 是否在后续轮次保留取决于具体模型与设置，不能统一把历史 thinking 全部扣掉。图片或文档还受请求体和数量限制，Token 没超限不等于请求一定有效。

## 请求前怎样计数？

`client.messages.count_tokens` 接收目标模型、系统提示和结构化消息等输入，返回 `input_tokens`。应按实际请求计数，不能只统计用户正文；换模型后也应重新计数。

官方明确这是估计值，可能与生成请求的实际输入量略有差异。计数接口支持的输入不完全等同于生成接口：部分服务端工具、MCP，以及某些图片或文件来源形式有限制；具体支持范围应以接口文档为准。

## 超限时会怎样？

输入本身超过窗口会被拒绝。输入与请求输出上限之和超窗时，部分模型允许请求，但生成到窗口边缘会提前停止；其他模型或配置可能直接报错。因此，请求被接受不等于能输出到指定上限。

预算设计应主动给输出和计数误差留空间，同时检查停止原因。窗口容量、输出上限、计费 Token 与速率限制是不同约束，不能互相代替。
