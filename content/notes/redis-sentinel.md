---
title: "Redis 哨兵（Sentinel）"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "Sentinel", "故障切换"]
aliases: ["Sentinel", "Redis Sentinel", "哨兵"]
---

**Sentinel（哨兵）是在不带分片的[[redis-replication|复制]]部署上做监控与自动故障切换（failover）的组件**：主节点故障时选一个副本提升为新主，并让其他组件找到新主。

- **判定故障**：单个 Sentinel 认为主节点不可用只是主观下线（subjectively down）；多个 Sentinel 达成共识后才是客观下线（objectively down），避免一个观察者误判就切换。
- **执行切换**：故障转移还要选出执行者、满足多数授权，再选一个合适的副本提升为新主。
- **客户端**：Sentinel 会通知客户端新主地址，**客户端必须能发现新主，不能永远连固定地址**。

依据见 [Sentinel](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)。
