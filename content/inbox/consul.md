---
title: "Consul"
category: "服务治理"
updated_at: "2026-10-08"
tags: ["Consul", "服务发现", "服务网格"]
aliases: ["Consul 服务发现", "Consul 健康检查"]
---

**Consul 提供服务目录、健康状态和发现接口**；启用服务网格时，还能通过数据面代理控制服务间通信。注意：注册一个服务不代表它已经健康，更不代表 Consul 自动代理了所有业务流量。

- **Agent 与 Server**：典型 Agent 部署里，应用所在节点的 Agent 接收服务注册、执行配置的健康检查；Server 保存目录等控制状态，通过 [[raft|Raft]] 复制。**Gossip 用于成员发现和故障探测，和业务服务的 HTTP/TCP 健康检查不是同一层信号。**
- **消费方**：通过 DNS 或 HTTP API 查实例，要明确是否只接受通过健康检查的实例。目录里有一条记录只说明注册还在，替代不了调用侧的超时和失败处理，见 [[service-discovery|服务发现]]。
- **服务网格**：网格模式下由代理承担实际连接、身份认证和流量策略，Consul 提供控制面配置。应用直接调服务地址，和流量经过 Envoy 等代理，是不同的部署路径——先确认实际数据面再看策略。
- **KV 的定位**：Consul 的 KV 适合配置和协调，别因为能存键值就当一般业务数据库用。目录、配置、ACL 和管理接口也要按环境和租户控制权限。

架构与服务发现见 [Consul 文档](https://developer.hashicorp.com/consul/docs) 和 [健康检查说明](https://developer.hashicorp.com/consul/docs/reference/service/health-check)。
