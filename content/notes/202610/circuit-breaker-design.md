---
title: "设计一个通用的熔断 / 降级策略"
updated_at: "2026-10-05"
tags: ["面试题"]
classes: ["overview"]
---

# 设计一个通用的熔断 / 降级策略

> 用滑动窗口统计失败率和慢调用比例，样本足够且达到阈值时熔断；按业务语义降级或快速失败，冷却后少量探测，达标再恢复。公共组件负责统计、状态切换和探测，业务提供异常分类、阈值及降级逻辑；调用设置超时，重试受总预算和熔断状态约束。

整个思考过程是：先考虑为什么需要熔断，再确定何时熔断、熔断后返回什么、如何恢复，最后区分通用机制与业务决策。

## 相关内容

- 上级主题：[[interview-map|面试题地图]]
- 展开：[[circuit-breaker-vs-timeout|已经有超时，为什么还需要熔断？]]
- 展开：[[circuit-breaker-failure-classification|哪些错误应该计入熔断，哪些不应该？]]
- 展开：[[circuit-breaker-fallback|熔断后，是降级还是快速失败？]]
- 展开：[[circuit-breaker-recovery|停止调用后，如何判断恢复？]]
- 展开：[[circuit-breaker-thresholds|失败累计到什么程度，才应该触发熔断？]]
