---
title: "Pydantic AI：工具集如何组合、筛选与执行"
parent: tool-registry
category: "Agent"
tags: ["Agent", "工具调用", "工具注册"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Toolsets 官方文档](https://pydantic.dev/docs/ai/tools-toolsets/toolsets/)"
---

**Pydantic AI 用工具集（Toolset）统一“提供工具定义”和“执行工具调用”，再通过包装层调整模型可见的集合。**

## 如何接入与复用

`FunctionToolset` 接入本地函数，`CombinedToolset` 组合多个来源。自定义工具集实现 `get_tools()` 和 `call_tool()`，分别负责给出定义和分发调用，使不同工具来源可以共用一套上层接口。

复用同一工具集时，无需复制实现；可以改变外层组合、名称或过滤条件。

## 包装层解决什么问题

组合后重名，可增加前缀或重命名；工具已经接入但当前不需要，可在每一步按运行上下文与工具定义筛选。文档用 `TestModel` 展示和检查模型实际拿到的工具集合。

由此形成“工具来源 → 组合与命名 → 每轮筛选 → 调用分发”的分工。它是应用内抽象，不要求独立注册服务；筛选也可以直接来自上下文，不一定先做工具搜索。

依据 2026-10-10 官方文档，未运行示例。
