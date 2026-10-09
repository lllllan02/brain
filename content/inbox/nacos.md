---
title: "Nacos"
category: "服务治理"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["注册中心", "服务发现", "配置中心"]
aliases: ["Dynamic Naming and Configuration Service"]
---

**Nacos（Dynamic Naming and Configuration Service）是阿里巴巴开源的微服务基础设施平台，核心能力是服务注册与发现、动态配置管理，既能承担服务注册中心的角色，也能作为配置中心。**

它主要提供以下能力：

- [[service-registry|服务注册中心]]：管理实例地址和健康状态，让调用方发现服务，并感知实例上下线。
- [[config-service|动态配置管理]]：集中保存配置并通知客户端变更；应用接入动态刷新后，可以减少因调整配置而重启的需要。
- 服务管理：通过命名空间、分组组织和隔离服务及配置，通过实例权重等信息支持客户端选择实例。
- 集群部署：支持多节点部署，提高可用性，减少对单个节点的依赖。

参考：[Nacos 官方介绍](https://nacos.io/en-us/docs/v2/what-is-nacos.html)、[核心概念](https://nacos.io/en-us/docs/concepts.html)。
