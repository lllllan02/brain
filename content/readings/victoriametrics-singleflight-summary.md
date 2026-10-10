---
title: "VictoriaMetrics：singleflight：合并正在执行的请求"
category: "Go"
updated_at: "2026-10-10"
tags: ["Go", "singleflight", "缓存击穿"]
aliases: ["请求合并", "singleflight"]
parent: victoriametrics-go-concurrency
---

**singleflight 让同一 Group 内、同一 key 的重叠请求共享执行结果，解决瞬时重复工作，而非长期缓存。**

原文：[Go Singleflight Melts in Your Code, Not in Your DB](https://victoriametrics.com/blog/go-singleflight/)，VictoriaMetrics。

- 可在缓存未命中时合并回源，缓解 [[cache-overload-protection|缓存击穿]]；执行结束后的新请求仍可再次执行。
- `Do` 同步等待，`DoChan` 返回结果通道；`shared` 描述结果被共享，首个执行者也可能得到 true。
- Group 内部用锁保护在途调用表，每个 key 的等待者复用同一调用；锁不覆盖整个业务函数，但高并发登记仍有竞争成本。
- 等待者超时不等于取消共享执行。`Forget` 移除登记，使后来者启动新执行，不会终止旧任务，因此可能出现重叠执行。

接入时 key 要区分不同请求语义，共享任务的超时也需独立设计。文章的 Operations 与 How Singleflight Works 分别展开接口和实现；[DoChan 的结果通道不会关闭](https://pkg.go.dev/golang.org/x/sync/singleflight#Group.DoChan)。
