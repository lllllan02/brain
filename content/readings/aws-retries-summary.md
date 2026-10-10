---
title: "AWS：超时、重试、退避与抖动"
parent: tool-scheduling-readings
category: "分布式系统"
tags: ["超时", "重试", "幂等"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)"
---

**重试既可能恢复暂时故障，也可能压垮已经过载的服务；AWS 用超时、有限重试、退避、抖动与幂等共同约束它。**

## 怎样限制等待与额外负载

超时应参考下游延迟分布和可接受的误超时比例，并核对计时是否覆盖连接、DNS、TLS 等阶段。超时过短会把本可成功的调用变成失败，再制造额外重试。

退避逐渐拉长重试间隔，同时限制间隔与次数。抖动（Jitter）为等待时间加入随机性，避免大量客户端在同一时刻再次请求。多层各自重试会乘法放大调用量，因此要选择合适的层统一负责。

## 为什么重试还依赖幂等

**超时只说明调用方没及时拿到结果，服务端可能已经完成操作。** 如果创建订单已成功但响应丢失，原样重试可能重复创建；这类副作用需要[[idempotency|幂等机制]]保护。

原文讨论的是分布式调用经验。用于工具执行时，要同时检查客户端与上层流程是否重复承担重试，而不能只在最外层加一个循环。
