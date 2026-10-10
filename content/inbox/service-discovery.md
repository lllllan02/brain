---
title: "服务发现（Service Discovery）"
category: "服务治理"
updated_at: "2026-10-09"
tags: ["服务发现", "注册中心"]
aliases: ["Service Discovery"]
---

**服务发现（Service Discovery）是调用方根据服务名称获取目标服务访问地址的机制，让调用方在实例变化时仍能找到目标服务，减少对固定 IP 和端口的依赖。** 可以通过[[service-registry|服务注册中心]]查询或订阅实例列表，也可以通过 DNS 获取服务入口。

例如，用户服务向 [[nacos|Nacos]] 登记 `user-service → 192.168.1.10:8080`，订单服务查询 `user-service`，取得实例列表后选择一个地址，发起 HTTP/RPC 调用。

实际工程中，调用方通常采用 **「本地缓存 + 动态更新」**，避免每次调用都查询注册中心：首次获取实例列表后保存在内存中，通过订阅通知、[[watch|Watch]] 或定时拉取更新列表，再由[[load-balancing|负载均衡]]策略选择实例进行调用。实例宕机后，注册中心检测异常并更新列表，调用方随后移除缓存中的故障实例；故障检测和更新传播存在延迟，因此仍需处理超时和调用失败。

[[service-registration|服务注册]]负责登记实例信息，服务发现负责获取地址，两者通常配套，但不要求业务程序主动注册。例如，Kubernetes 可以由平台维护服务端点，调用方通过 Service DNS 获取服务入口；普通 Service 的 DNS 通常返回虚拟 IP，而非每个 Pod 的地址。静态配置也能提供地址，但本身不能自动跟踪实例变化。

参考：[Kubernetes 服务与网络](https://kubernetes.io/docs/concepts/services-networking/)、[Service DNS](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)。
