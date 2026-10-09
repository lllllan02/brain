---
title: "服务注册与发现必须配套吗"
category: "服务治理"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["服务注册", "服务发现"]
aliases: ["服务注册与发现的关系"]
---

**服务注册与发现通常配套使用，但它们是不同职责，不要求每个服务都主动向注册中心登记。** [[service-registration|注册]]建立实例信息，[[service-discovery|发现]]使用这些信息定位服务，常见过程是「登记实例 → 查询或订阅 → 选择地址并调用」。

注册记录可以只用于监控和管理，不参与服务调用；发现所需的地址也可以由平台维护。例如，Kubernetes 对带选择器的 Service 自动维护后端端点，调用方通过 Service DNS 找到服务入口，业务程序无需主动注册。普通 Service 的 DNS 通常返回服务的虚拟 IP，而非直接返回每个 Pod 的地址。

所以，需要区分「业务程序没有主动注册」和「系统没有维护服务信息」：前者仍然可以提供服务发现，地址信息的维护工作由其他组件承担。

参考：[Kubernetes 服务与网络](https://kubernetes.io/docs/concepts/services-networking/)、[Service DNS](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)。
