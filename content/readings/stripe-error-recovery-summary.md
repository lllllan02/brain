---
title: "Stripe：结果未知时怎样安全重试"
parent: retry-decision
category: "分布式系统"
tags: ["重试", "异常分类"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Advanced error handling](https://docs.stripe.com/error-low-level)"
---

**Stripe 将网络错误和部分服务端错误视为可能已经产生副作用的情况，要求保留操作身份并核查结果。** 以下幂等缓存规则针对 API v1，不能直接套到 API v2。

## 同一次操作保留什么

网络断开后，无法确定请求是否执行。文档要求在原请求后的 24 小时内，以相同幂等键和参数重试；过了窗口仍不确定，应查询对象、检查请求记录或通过 Webhook 核对，不能随意换新键重做。

若要修改参数，应先确认原操作未成功且未在执行，再为修正后的操作使用新键。409 若表示相同键的请求仍在运行，则等待后沿用原键。

## 为什么 500 也不能盲目重发

API v1 会缓存带幂等键的 POST 执行结果，包括 500。原键可能只返回缓存错误，新键却可能再次产生副作用，因此需要核查原操作。[服务端错误](https://docs.stripe.com/error-low-level#server-errors)

服务还可用 `Stripe-Should-Retry` 响应头明确建议重试或停止；缺失时再综合其他信息。这个案例说明，状态码、服务重试约定和操作结果需要一起判断。

按 2026-10-10 文档总结，未执行 API 调用。
