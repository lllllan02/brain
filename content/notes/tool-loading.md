---
learning_status: understood
title: "工具按需加载"
parent: tool-calling
aliases: ["工具延迟加载", "Deferred Tool Loading"]
category: "Agent"
tags: ["Agent", "工具调用", "按需加载"]
created_at: "2026-10-09"
updated_at: "2026-10-17T12:19:10+08:00"
reading_suggestions:
  - tool-registry
  - claude-tool-search
  - openai-tool-search-summary
  - fastmcp-visibility-summary
---

**工具按需加载（Deferred Tool Loading）是根据当前任务，将需要的工具定义提供给模型的机制。** 加载的是用途说明、参数约束（Schema）等调用信息；工具已在[[tool-registry|注册表]]接入，实现代码无需重新加载。

工具多时，一次提供全部定义会占用大量上下文，也让模型更难选出合适工具。按需加载先提供少量常用工具和发现入口，等任务需要其他能力时再补充定义，减少无关信息。

![[assets/tool-loading-comparison.png|同一份工具目录下，全部加载将所有定义提供给模型，按需加载先提供少量定义与搜索入口]]

## 加载过程

程序可以在调用模型前按任务阶段、运行状态筛选工具，[[pydantic-toolsets-summary|Pydantic AI 工具集]]就支持这种方式；也可以让模型通过搜索发现工具。两者可以配合：程序先限定候选范围，模型再查找所需能力。

例如查询订单物流时，程序先提供订单查询工具和搜索入口；模型发现缺少物流能力，便搜索工具目录，由 API 或程序补充完整定义，再生成调用参数，由程序执行并回传结果。只返回工具名，仍不足以说明怎样传参。

![[assets/tool-loading-flow.png|查询订单物流示例：搜索匹配物流工具，加载用途与参数定义，模型生成调用参数，程序执行并返回物流结果]]

**「搜索取得调用方式，执行取得业务结果」。** 工具执行后产生的日志或文档，属于另一类[[context-loading|结果与资料的按需读取]]。

## 取舍与边界

- 工具少时可直接全部提供：搜索增加交互，也可能漏选。应比较整次任务的上下文占用、选择正确率和总耗时，常用工具可保持加载。
- 搜索无结果不等于没有能力：目录需写清用途和限制；可在授权范围内改写查询或查看业务分组，仍找不到就说明未找到可用工具。
- 加载与复用取决于接口：初始暴露信息、请求是否携带完整目录、已加载定义如何保留，由具体协议决定，[[claude-tool-search|Claude Tool Search]]与[[openai-tool-search-summary|OpenAI 工具搜索]]各有实现。
- 模型可见性与执行权限分开控制：搜索和执行均须遵守用户、租户权限；未加载不代表禁止调用。[[fastmcp-visibility-summary|服务端可见性控制]]属于另一层控制。
