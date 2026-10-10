---
title: "OpenAI：工具搜索与延迟加载"
parent: tool-loading
category: "Agent"
tags: ["Agent", "工具调用", "按需加载"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Tool search](https://developers.openai.com/api/docs/guides/tools-tool-search)"
---

**工具搜索把完整定义的加载推迟到模型需要时，以减少上下文占用。** 以下是 Responses API 的实现，不是所有 Chat Completions 兼容接口的通用能力。

## 模型先看到什么？

添加 `tool_search`，将候选工具标记为 `defer_loading: true`。单个函数仍暴露名称与描述，主要延迟参数 Schema；按 namespace 或 MCP Server 分组时，先暴露组名与描述，再搜索组内函数。

## 谁负责搜索？

- 托管搜索：请求中声明候选，由 OpenAI 搜索并加载子集；定义延迟进入上下文，不等于省去请求中的定义。
- 客户端搜索：模型发出 `tool_search_call`，应用检索并返回 `tool_search_output`，适合依赖租户或项目状态的目录。

加载出的工具按正常流程调用；新增定义追加到上下文末尾，以保留已有缓存。返回动态定义时，应校验 Schema 并仅暴露可信工具。

这为[[tool-loading|按需加载]]提供了明确的协议实例。配置与两种搜索流程见原文；本文按 2026-10-10 文档整理，模型支持范围以官方页面为准。
