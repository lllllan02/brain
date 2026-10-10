---
title: "AWS SDK：按错误语义判断是否重试"
parent: retry-decision
category: "分布式系统"
tags: ["重试", "异常分类"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)"
---

**AWS SDK 先识别服务错误码，再回退到 HTTP 状态码，把错误分为暂时故障、限流和不可重试三类。**

## 状态码为什么不够

同样是 HTTP 400，`RequestTimeout` 被归为暂时故障，`ValidationException` 则直接返回。5xx 若带有限流错误码，也按限流处理，而非普通服务故障。

- 暂时故障：连接重置、Socket 超时、`InternalError`，以及没有已识别错误码的 500、502、503、504。
- 限流：如 `ThrottlingException`、`TooManyRequestsException`，采用更长的基础等待。
- 不可重试：如 `AccessDeniedException`、`ValidationException`、`ResourceNotFoundException`，需要调用方处理。

这是一份 AWS 的分类表，不是任意 HTTP 服务的通用白名单。[错误分类章节](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html#:~:text=Which%20errors%20are%20retried)

## 可重试也会停止

SDK 还会检查最大尝试次数与重试令牌额度；额度耗尽后停止追加请求，避免持续故障被重试放大。

按 2026-10-10 页面总结：文档所述新行为当时需要启用 `AWS_NEW_RETRIES_2026`，旧行为在退避和额度等方面有差异。未运行验证，不将页面默认值推广到所有 SDK 版本。
