---
title: "服务注册中心（Service Registry）"
category: "服务治理"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["注册中心", "服务注册", "服务发现"]
aliases: ["Service Registry", "注册中心"]
---

**服务注册中心（Service Registry）是集中管理服务实例名称、地址及状态的基础设施，为服务注册与发现提供服务目录，通常配合健康检查或心跳维护可用实例信息。**

[[service-registration|服务注册]]负责把实例信息登记进来，[[service-discovery|服务发现]]负责查询或订阅这些信息。例如，注册中心保存 `user-service → IP:端口列表`，调用方获取列表后选择实例发起调用。

[[nacos|Nacos]]、[[consul|Consul]]、[[eureka|Eureka]] 都可以承担这个角色；[[zookeeper|ZooKeeper]] 本质上是协调服务，也可以利用临时节点和 [[watch|Watch]] 构建注册与发现机制。注册中心是一个功能角色，不一定由独立部署的中间件承担，Kubernetes 也能通过 Service、EndpointSlice 和 DNS 等机制提供相应能力。
