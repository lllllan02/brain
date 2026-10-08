---
title: "Redis 过期与淘汰"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "TTL", "内存淘汰"]
aliases: ["Redis expiration", "Redis eviction", "过期删除", "内存淘汰"]
---

**过期删除（expiration）和内存淘汰（eviction）是两回事**：前者按每个 key 的 TTL（time to live）删除到期数据，后者在达到 `maxmemory` 上限后为腾出内存而删数据。所以一个 key 没过期也可能被淘汰，一个 key 到期也不代表内存立刻在该时刻释放。

## 过期怎么删

Redis 在访问 key 时检查是否过期（惰性删除），也会主动抽样检查一部分带 TTL 的 key。这样避免给每个 key 精确调度删除，代价是**物理回收与逻辑到期之间存在时间差**——业务应依赖读取语义，不要依赖某个瞬间 RSS 必然下降。

## 淘汰怎么选

淘汰策略由「候选集合 × 选择方式」决定：候选集合 `allkeys` 面向全部 key、`volatile` 只面向带过期时间的 key；选择方式有 LRU（近似最近最少使用）、LFU（近似访问频率最低）和随机。**`volatile` 找不到候选时也可能满足不了新写入**；`noeviction` 则直接拒绝需要更多内存的写命令，它不是[[redis-persistence|持久化]]或无损保证。

## 实践边界

缓存 TTL 要覆盖业务允许的陈旧时间，并用随机抖动分散集中到期。核心会话、锁与可丢缓存混用同一实例时，要认真评估淘汰影响，不能只靠 key 前缀隔离。另外 `maxmemory` 不等于进程总内存上限，还要为复制缓冲、客户端缓冲、碎片和后台持久化预留空间。

策略定义见 [Redis Key eviction](https://redis.io/docs/latest/develop/reference/eviction/)。
