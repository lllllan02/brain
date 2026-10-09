---
title: "Eureka"
category: "服务治理"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["注册中心", "服务注册", "服务发现"]
aliases: ["Netflix Eureka"]
---

**Eureka 是 Netflix 开源的服务注册与发现组件，用于动态管理微服务实例，是 Spring Cloud Netflix 体系中的服务注册中心。**

它由保存注册信息的 Eureka Server 和集成在应用中的 Eureka Client 配合工作：

- 注册与发现：服务通过 Client 向 Server 登记地址，调用方获取实例列表后选择目标进行调用，完成[[service-discovery|服务发现]]。
- 心跳续约：实例定期发送心跳，Server 据此判断注册是否仍有效；心跳正常不等于业务请求一定成功。
- 本地缓存：Client 缓存实例列表并定期更新，不必每次调用都访问注册中心。
- 高可用：支持多节点部署；心跳大面积缺失时，自我保护机制可暂停过期实例剔除，减少网络异常导致的误删，但也可能暂时保留失效实例。

相比同时提供配置管理的 [[nacos|Nacos]]，Eureka 的核心职责集中在[[service-registry|服务注册中心]]，解决服务之间如何动态找到彼此的问题。

参考：[Spring Cloud Netflix 文档](https://docs.spring.io/spring-cloud-netflix/docs/current/reference/html/index.html)、[Eureka 自我保护机制](https://github.com/Netflix/eureka/wiki/Server-Self-Preservation-Mode)。
