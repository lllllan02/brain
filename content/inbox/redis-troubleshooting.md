---
title: "Redis 请求变慢时怎样区分客户端与服务端问题？"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "延迟", "排查"]
type: "practice"
---

Redis 延迟需要拆成客户端排队、连接与网络、服务端执行和响应传输。SLOWLOG 主要记录命令执行时间，未出现慢命令不能证明端到端没有问题。

先按实例和命令比较请求量、延迟及错误，再检查客户端连接池等待、超时重试、网络往返与响应大小。大范围扫描、大集合操作或大值返回，可能同时拖慢执行与传输；应结合具体 key 和命令确认，避免只看平均耗时。

热点 key 会让负载集中到单个分片。扩容集群不会自动把同一个 key 分散处理，需要本地缓存、请求合并或业务拆分，并接受相应的一致性成本。big key 则影响序列化、迁移、删除和网络，不能与 hot key 混为一谈。

排查可以结合 SLOWLOG、延迟监控和低速 SCAN 抽样；不要在高峰直接全库 KEYS。基于 LFU 的热点识别依赖相应配置与统计，不能把一个工具的输出理解为对所有淘汰策略都适用。

内存要同时看数据集大小与 RSS：碎片、客户端缓冲、副本缓冲和持久化时的写时复制都可能增加实际内存。[[redis-persistence|RDB 或 AOF]] 的后台任务也可能引起磁盘和内存压力。删除大对象时可评估 UNLINK 的异步释放，但仍需控制总工作量。

`noeviction` 只规定内存不足时不主动淘汰数据，不保证数据永不丢失；可靠性还取决于持久化、复制与故障恢复。

指标与耗时边界见 [INFO](https://redis.io/docs/latest/commands/info/)、[SLOWLOG](https://redis.io/docs/latest/commands/slowlog/) 和 [延迟诊断](https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/)。
