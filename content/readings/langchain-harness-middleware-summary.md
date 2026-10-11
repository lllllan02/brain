---
title: "LangChain：用中间件扩展 Agent 循环"
parent: agent-harness
category: "Agent"
tags: ["Agent", "Harness"]
created_at: "2026-10-11T11:46:46+08:00"
updated_at: "2026-10-11T12:33:19+08:00"
source: "[How Middleware Lets You Customize Your Agent Harness](https://www.langchain.com/blog/how-middleware-lets-you-customize-your-agent-harness)"
---

**中间件把定制逻辑接入 Agent 循环的明确位置，使不同运行职责能组合使用，而不必每次重写循环。**

## 为什么提示词与工具参数还不够？

传入提示和工具很容易；但「每次调用前整理历史」「执行工具前拦截」「失败后重试」涉及循环控制。若这些动作必须发生，就需要程序扩展点，不能只期待模型遵守文字要求。

## 先确定逻辑应在哪个阶段发生

| 时机 | 原文接口 | 典型职责 |
| --- | --- | --- |
| 整次运行开始与结束 | `before_agent`、`after_agent` | 加载资源、保存结果、清理环境 |
| 每次模型调用前后 | `before_model`、`after_model` | 整理输入、检查响应 |
| 包裹一次模型调用 | `wrap_model_call` | 缓存、重试、动态调整请求 |
| 包裹一次工具执行 | `wrap_tool_call` | 控制调用、注入信息、处理结果 |

「每轮」与「每次运行」不同，决定了检查频率和资源生命周期；包装调用则能控制实际执行与异常处理。

## 这些位置如何解决具体问题？

原文的动态工具选择器先选出相关工具，再绑定到主模型请求，减少无关定义占用窗口。摘要中间件在模型调用前检查容量，必要时压缩历史；扩展工具包装逻辑还可把冗长结果转存文件。

重试中间件包裹模型请求，统一配置次数与退避。Shell 工具则在运行前初始化、运行后清理，并把工具加入模型可用列表。这些例子说明，中间件同时处理策略与资源生命周期。

## Deep Agents 为什么建立在同一层上？

Deep Agents 以 `create_agent` 为核心，再组合文件系统、子 Agent、摘要和 Skills 等中间件。业务可以复用现成组合，也能增加自己的逻辑。

作者认为模型改进会改变部分中间件，但业务约束与运行控制仍需要程序承担。这是框架设计观点，不表示某个钩子自动保证业务正确。

## 原文定位

2026-03-26。重点看 hooks、具体中间件案例与 `Deep Agents case study`。接口依据文章版本，本文未运行示例。
