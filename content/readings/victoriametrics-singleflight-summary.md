---
title: "VictoriaMetrics：singleflight：合并正在执行的请求"
category: "Go"
updated_at: "2026-10-10"
tags: ["Go", "singleflight", "缓存击穿"]
aliases: ["请求合并", "singleflight"]
parent: victoriametrics-go-concurrency
source: "[Go Singleflight Melts in Your Code, Not in Your DB](https://victoriametrics.com/blog/go-singleflight/)，VictoriaMetrics"
---

**singleflight 让同一 Group、同一 key 的重叠请求共享一次执行结果，减少瞬时重复工作。**

## 如何合并请求

Group 用锁保护在途调用表：首个请求登记并执行，后来的同 key 请求等待该调用，完成后共享结果。锁不覆盖整个业务函数，但大量请求登记仍可能产生竞争。

它可在缓存未命中时合并回源，缓解[[cache-overload-protection|缓存击穿]]；执行结束后的新请求仍能重新执行，因此不能代替长期缓存。`Do` 同步等待，`DoChan` 返回结果通道；`shared` 表示结果被共享，首个执行者也可能得到 true。

## 超时与 Forget 不做什么

等待者超时不会自动终止共享任务。`Forget` 只移除登记，让后来者能够发起新调用；旧任务仍可能运行，因此两次执行可能重叠。

接入时，key 要区分不同请求语义，共享任务的超时应另行设计。[`DoChan` 的结果通道不会关闭](https://pkg.go.dev/golang.org/x/sync/singleflight#Group.DoChan)，不能用等待关闭来判断完成。
