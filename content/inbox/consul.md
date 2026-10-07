---
title: "Consul 怎样连接服务目录、健康检查与流量？"
category: "服务治理"
updated_at: "2026-10-07"
tags: ["Consul", "服务发现", "服务网格"]
type: "concept"
---

Consul 提供服务目录、健康状态和发现接口；启用服务网格时，还可通过数据面代理控制服务间通信。注册一个服务，不代表它已经健康，更不代表 Consul 自动代理了所有业务流量。

典型 Agent 部署中，应用所在节点的 Agent 接收服务注册并执行配置的健康检查；Server 保存目录等控制状态，并通过 [[raft|Raft]] 复制。Gossip 用于成员发现和故障探测，与业务服务的 HTTP、TCP 等健康检查不是同一层信号。

消费者通过 DNS 或 HTTP API 查找实例，需要明确是否仅接受通过健康检查的实例。目录中存在一条记录只能说明注册存在，不能替代调用侧超时和失败处理，见 [[service-discovery|服务发现]]。

服务网格模式下，代理承担实际连接、身份认证和流量策略，Consul 提供控制面配置。应用直接调用服务地址，与流量经过 Envoy 等代理，是不同的部署路径，应先确认实际数据面。

Consul 的 KV 适合配置和协调，不能因为能存键值就把它当作一般业务数据库。目录、配置、ACL 与管理接口也应按环境和租户控制权限。

架构与服务发现见 [Consul 文档](https://developer.hashicorp.com/consul/docs) 和 [健康检查说明](https://developer.hashicorp.com/consul/docs/reference/service/health-check)。
