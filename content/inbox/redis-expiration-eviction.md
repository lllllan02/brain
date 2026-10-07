---
title: "Redis 过期删除和内存淘汰有什么不同？"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "TTL", "内存淘汰"]
---

过期删除处理已经超过 TTL 的 key，内存淘汰处理达到 maxmemory 后的容量压力。一个 key 没有过期，也可能被淘汰；一个 key 到期后，也不代表内存立即在该时刻全部释放。

Redis 在访问 key 时检查过期，也会主动抽样检查一部分带 TTL 的 key。这种方式避免为每个 key 精确调度删除，但会让物理回收与逻辑到期存在时间差。业务应依赖读取语义，不应依赖某个瞬间 RSS 必然下降。

淘汰策略决定候选集合和选择方式：allkeys 面向全部 key，volatile 面向带过期时间的 key；LRU 近似选择较久未使用的数据，LFU 近似选择访问频率较低的数据，随机策略则不依据访问历史。volatile 策略没有可淘汰候选时，也可能无法满足新写入。

`noeviction` 在超出限制时拒绝需要更多内存的相关写命令，而非自动扩容。它不等于持久化或无损保证，仍需考虑 [[redis-persistence|进程重启恢复]] 和 [[redis-high-availability|故障切换]]。

缓存 TTL 应覆盖业务允许的陈旧时间，并用随机抖动分散集中到期。核心会话、锁与可丢缓存混用同一实例时，应认真评估淘汰影响；不同数据的重要性不能只靠 key 前缀隔离。

maxmemory 也不等于进程总内存上限，需要为复制缓冲、客户端缓冲、碎片和后台持久化预留空间。

策略定义见 [Redis Key eviction](https://redis.io/docs/latest/develop/reference/eviction/)。
