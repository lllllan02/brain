---
title: "Eino 的 Langfuse Trace 集成"
category: "Agent"
tags: ["Agent", "Trace", "可观测性", "埋点"]
created_at: "2026-10-12T23:48:23+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://langfuse.com/self-hosting/deployment/docker-compose"
  - "https://langfuse.com/self-hosting/administration/headless-initialization"
  - "https://github.com/langfuse/langfuse/blob/main/docker-compose.yml"
  - "https://github.com/cloudwego/eino-ext/tree/main/callbacks/langfuse/v2"
  - "https://pkg.go.dev/github.com/cloudwego/eino-ext/callbacks/langfuse/v2@v2.0.2"
  - "https://www.cloudwego.io/docs/eino/core_modules/eino_adk/adk_agent_callback/"
  - "https://langfuse.com/integrations/native/opentelemetry"
reading_suggestions:
  - langfuse-dataset-experiments
---

**「Go 项目使用 Eino 时，可以复用 CloudWeGo 维护的 Langfuse 回调扩展，自动记录框架组件，再补业务验收与上下文加工。」** Eino 负责运行，回调负责观测映射与导出，Langfuse 负责存储和查看。它不是 Langfuse 官方通用 Go SDK。

## 从哪里接入？

[扩展仓库](https://github.com/cloudwego/eino-ext/tree/main/callbacks/langfuse/v2)提供 `github.com/cloudwego/eino-ext/callbacks/langfuse/v2`。核对日期为 2026-10-12；本地检查了 v2.0.2 源码，其 go.mod 声明 Go 1.23、Eino v0.9.14 和 OTel v1.38.0。这是依赖核对结果，未编译或联调，不代表其他版本已经兼容。

v2 使用 `NewHandler`、`StartTrace`、`EndTrace`、`Flush` 和 `Shutdown` 管理生命周期，通过 OTLP/HTTP 向 Langfuse 导出。旧版的 `NewLangfuseHandler` 示例不能直接混用。端点、认证和协议应交给扩展处理；具体部署条件可核对 [Langfuse OTel 接入文档](https://langfuse.com/integrations/native/opentelemetry)。

## 框架记录能覆盖到哪里？

模型、工具和 Agent 有相应观测类型；组件提供的输入输出及模型用量可以随回调采集。框架之外的上下文筛选、业务规则和实际状态验收仍需应用补充。仅有工具返回成功，无法证明退款等业务动作完成。

[Agent Callback 文档](https://www.cloudwego.io/docs/eino/core_modules/eino_adk/adk_agent_callback/)要求**「通过 ADK Runner 运行以触发 Agent 回调」**；直接调用 `agent.Run()` 不触发该层回调。运行时注册与全局注册要选择清楚，避免重复记录。事件迭代器和消息流也要消费、关闭，不能取得迭代器就视为任务结束。

## 哪些边界值得在实验中验证？

本地 v2.0.2 的 `trace.go` 中，`StartTrace` 会清除传入上下文的父 SpanContext 并新建根。因此 HTTP 请求已有 Span 时，**「不能假设这次调用会自动接成它的子节点」**；应明确采用独立 Agent Trace 并关联请求，或核对所选版本支持的其他接法。

源码提供自定义 `SpanExporter`，适合无云端凭据的本地断言。测试应观察实际导出的 Span、父子关系与结束状态，再联调平台展示；控制台打印一棵预设树不能证明自动埋点有效。

运行观测扩展不承担 datasets、scores 等管理 API。[[langfuse-dataset-experiments|数据集与实验]]需要另外核对平台支持的接口，不能臆造 `handler.Score` 一类方法。输入输出脱敏也不能替代对 metadata、错误及资源属性的检查。

## 本地部署怎样免去手工初始化？

[官方 Compose 配置](https://github.com/langfuse/langfuse/blob/main/docker-compose.yml)包含 web、worker、PostgreSQL、ClickHouse、Redis 与对象存储；[部署文档](https://langfuse.com/self-hosting/deployment/docker-compose)说明启动、端口和数据卷处理。仅启动界面容器不足以验证采集链路。核对的是在线配置，未在本项目启动 Docker。

[Headless Initialization](https://langfuse.com/self-hosting/administration/headless-initialization)通过 `LANGFUSE_INIT_*` 在启动时创建缺失的组织、项目、用户及项目密钥，资源有组织到项目、密钥的依赖关系。可由实验脚本预设 ID、生成并持久化密钥，再给应用使用同一份配置；这是实验自动化设计，不要求用户手工填这些变量。已有资源不会因为重复启动而自然等同于重新配置，因此初始化脚本仍需验证凭据有效。

**「容器启动、项目认证、遥测导出、平台查询到观测是不同验收点」**。自动实验需要逐层等待并检查，不能以 `docker compose up` 返回成功作为收集完成的证据。
