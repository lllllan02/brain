---
title: "Redis 高可用（High Availability）"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "复制", "Sentinel", "Cluster"]
aliases: ["Redis High Availability"]
---

**Redis 高可用由三块拼成：[[redis-replication|复制]]提供副本，[[redis-sentinel|Sentinel（哨兵）]]在非分片主从部署里做故障切换，[[redis-cluster|集群（Cluster）]]同时提供分片与分片级切换。** 后两者都建立在复制之上。

它们提高可用性，但消不掉丢失：复制是异步的，**主节点回复成功时，写入未必已经到达将来被选中的副本**，切换也可能选到落后的副本。所以高可用方案要和可接受的丢失窗口一起设计，复制也不等于备份。
