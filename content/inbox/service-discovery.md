---
title: "服务发现（Service Discovery）"
category: "服务治理"
updated_at: "2026-10-09"
tags: ["服务发现", "注册中心"]
aliases: ["Service Discovery"]
---

**服务发现（Service Discovery）是调用方根据服务名称获取目标服务访问地址的机制，让调用方在实例变化时仍能找到目标服务，减少对固定 IP 和端口的依赖。** 可以通过注册中心查询或订阅实例列表，也可以通过 DNS 获取服务入口。

例如，订单服务需要调用用户服务：`查询 user-service → 获取实例 IP 和端口 → 选择实例并发起调用`。返回的地址可能因缓存或故障检测延迟而失效，因此发现服务后仍需处理调用失败。

[[service-registration|服务注册]]负责登记实例信息，服务发现负责获取地址。两者[[service-registration-discovery|通常配套但不要求业务程序主动注册]]；静态配置也能提供地址，但配置本身不具备自动跟踪实例变化的能力。
