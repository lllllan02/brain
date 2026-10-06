---
title: "设计一个通用的熔断 / 降级策略"
updated_at: "2026-10-05"
tags: ["面试题"]
classes: ["overview"]
---

> 用滑动窗口统计失败率和慢调用比例，样本足够且达到[[circuit-breaker-thresholds|阈值]]时熔断；按业务语义[[circuit-breaker-fallback|降级或快速失败]]，[[circuit-breaker-recovery|冷却后少量探测]]，达标再恢复。[[circuit-breaker-component-boundaries|公共组件]]负责统计、状态切换和探测，业务提供[[circuit-breaker-failure-classification|异常分类]]、阈值及降级逻辑；调用设置[[circuit-breaker-vs-timeout|超时]]，重试受总预算和熔断状态约束。
