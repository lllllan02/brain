---
title: "Go sync.Map"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "sync.Map", "并发"]
aliases: ["sync.Map", "并发安全 map"]
---

**sync.Map 是一个并发安全的 map，适合「键基本只写一次、频繁读」或不同 goroutine 操作较独立键集合的场景。** 它只保证单个方法并发安全：Load 和 Store 是两次操作，先 Load 再 Store 不等于原子的「读取并增加」。

## 怎么用

- 需要类型约束、或要同时维护多个字段关系时，普通 map 加锁通常更清楚，见 [[go-map-concurrency|map 同步方式]]。
- `LoadOrStore`、`CompareAndSwap` 等方法只提供各自定义的原子边界，其中的比较值还要可比较。
- 存进去的指针或 slice 不会自动获得内部并发保护。
- `Range` 不提供同一时刻的快照，遍历中看到的键值可能来自不同时间；要一致快照得自己协调写入或发布不可变副本。

接口：[sync.Map](https://pkg.go.dev/sync#Map)。旧版 read/dirty 双表的实现见 [[victoriametrics-sync-map-summary|sync.Map 的实现（Go 1.21）]]。
