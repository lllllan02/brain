---
title: "熔断（Circuit Breaker）"
category: "服务治理"
updated_at: "2026-10-08"
tags: ["熔断", "降级", "服务治理"]
type: "overview"
---

**熔断（circuit breaker）是一种依赖保护机制**：当下游在一段时间内持续失败或变慢时，暂时停止对它的调用，让请求快速失败或走降级，避免故障和重试把调用方资源一起拖垮。它保护的是调用方，也让下游留出恢复空间。

超时限制单次请求能等多久，重试只处理偶发失败；两者都挡不住持续性故障时，才由熔断按一段时间内的统计结果，决定还要不要继续访问依赖，见 [[circuit-breaker-vs-timeout|为什么超时之外还需要熔断]]。

一次熔断由几个环节组成：通用组件负责统计、状态切换和探测额度，业务提供保护粒度、异常分类、阈值与降级逻辑。

- [[circuit-breaker-thresholds|触发条件]]：统计窗口内样本足够，且失败率或慢调用比例达到阈值。
- [[circuit-breaker-failure-classification|异常分类]]：只有反映下游或链路故障的错误才计入统计。
- [[circuit-breaker-fallback|降级与快速失败]]：业务允许时返回替代结果，否则快速失败，不伪造成功。
- [[circuit-breaker-recovery|恢复判断]]：冷却后进入半开，少量真实探测通过才恢复放行。
