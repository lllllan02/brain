---
title: "Pydantic AI：工具集如何组合、筛选与执行"
parent: tool-registry
category: "Agent"
tags: ["Agent", "工具调用", "工具注册"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**Pydantic AI 用工具集（Toolset）统一组织工具，并通过组合与包装调整暴露方式。** 这是一种应用内抽象，不要求部署独立的注册服务。

来源：[Toolsets 官方文档](https://pydantic.dev/docs/ai/tools-toolsets/toolsets/)，按 2026-10-10 页面总结，未运行示例。

## 怎样组织工具

`FunctionToolset` 接入本地函数，`CombinedToolset` 合并多个工具集。自定义工具集实现 `get_tools()` 和 `call_tool()`，分别提供定义与处理调用，使工具来源和执行方式可以封装在同一接口后。[工具集组合](https://pydantic.dev/docs/ai/tools-toolsets/toolsets/#:~:text=Toolset%20Composition)、[自定义工具集](https://pydantic.dev/docs/ai/tools-toolsets/toolsets/#:~:text=Building%20a%20Custom%20Toolset)

## 为什么还需要包装层

- 组合后可能重名：前缀或重命名明确工具身份。
- 工具已接入，但本轮未必需要：过滤器在每一步根据运行上下文与工具定义筛选。
- 多处复用同一组工具：调整外层组合与过滤，不必复制工具实现。

文档展示了过滤前后的模型可见列表，可用 `TestModel` 检查实际提供了哪些定义。[筛选与命名](https://pydantic.dev/docs/ai/tools-toolsets/toolsets/#:~:text=Filtering%20Tools)

可借鉴的结构是「工具来源 → 组合与命名 → 每轮筛选 → 调用分发」。工具集不限于保存一个 Map，也不意味着必须先做搜索；过滤条件可以直接来自应用上下文。
