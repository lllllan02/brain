---
title: "AWS：用幂等 API 保证重试安全"
parent: retry-decision
category: "分布式系统"
tags: ["幂等", "重试"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)"
---

**安全重试需要识别「同一次业务意图」，使重复请求不会重复创建资源或产生副作用。** AWS 用调用方提供的唯一请求标识表达这个约定。

## 为什么不能只比较参数

原文以创建 EC2 实例为例：请求超时后，调用方无法确定实例是否已经创建；直接再创建可能得到两个实例。但两个参数相同的请求，也可能本来就想创建两个实例，不能简单按参数去重。

做法是同一次操作重试沿用同一请求 ID，服务端识别重复并返回语义等价的结果；这不要求所有响应字段逐字相同，例如资源状态可能已经变化。

## 服务端需要保证什么

记录请求 ID 与实际资源变更需要满足原子性，避免只记了 ID 却没执行，或执行了却没记 ID。去重记录还需覆盖迟到请求可能到达的时间；保留期限取决于服务和资源生命周期。

同一请求 ID 携带不同参数时，AWS 返回参数不匹配错误，而不是继续执行。因而重试不仅要保留标识，还要校验最初参数。这些保证依赖服务端实现，客户端自行生成 ID 并不能让任意 API 自动幂等。

这篇补充了 [[aws-retries-summary|退避与重试控制]]中的副作用边界；具体例子可回看原文的 `Late arriving requests` 与 `Same client request ID, different intent` 两节。
