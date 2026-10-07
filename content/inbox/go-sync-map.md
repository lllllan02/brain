---
title: "sync.Map 的并发保证覆盖到哪里？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "sync.Map", "并发"]
aliases: ["sync.Map"]
---

sync.Map 提供并发安全的单项操作，适合键基本只写一次而频繁读取，或多个 goroutine 操作较独立键集合的场景。需要类型约束或同时维护多个字段关系时，普通 map 配合锁通常更清楚，见 [[go-map-concurrency|map 同步方式]]。

Load 后再 Store 是两次操作，不能自动组成原子“读取并增加”。LoadOrStore、CompareAndSwap 等方法只提供各自定义的原子边界；其中的比较值还要满足可比较要求。存进去的指针或 slice 也不会自动获得内部并发保护。

Range 不提供同一时刻的快照，遍历过程中看到的键值可能来自不同时间。若业务要求一致快照，应显式协调写入或发布不可变副本。

## read 与 dirty 是历史实现

Go 1.21 的实现包含只读入口 read 与锁保护的 dirty。read 命中可减少全局锁竞争，缺失时按状态检查 dirty；多次访问 dirty 后可将其晋升为 read。删除标记、expunged 状态以及 entry 中的原子指针，用来协调两张表对同一条目的生命周期。

read 并不意味着条目值永远不变，dirty 也不等于只存最新写入的键。双表复制和晋升会有成本，因此不能用固定“读超过 90%”比例证明它一定更快。

Go 1.24 已改为并发哈希 Trie，旧模型只能用于对应版本。[变更说明](https://go.dev/doc/go1.24#sync)

原阅读：[VictoriaMetrics 的 sync.Map 分析](https://victoriametrics.com/blog/go-sync-map)，历史源码：[Go 1.21.13 map.go](https://github.com/golang/go/blob/go1.21.13/src/sync/map.go)。
