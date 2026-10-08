---
title: "Go sync.Map 的实现（Go 1.21）"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["Go", "sync.Map", "源码"]
aliases: ["sync.Map read dirty"]
---

**Go 1.21 的 sync.Map 用只读入口 read 加锁保护的 dirty 两张表来减少锁竞争。**

read 命中可以不加全局锁；缺失时按状态查 dirty，多次访问 dirty 后可以把它晋升为 read。删除标记、expunged 状态和 entry 中的原子指针，用来协调两张表对同一条目的生命周期。

read 不代表条目值永远不变，dirty 也不等于只存最新写入的键。双表复制和晋升都有成本，所以不能用「读超过 90%」这类固定比例证明它一定更快。

Go 1.24 已改为并发哈希 Trie，旧模型只适用于对应版本。[变更说明](https://go.dev/doc/go1.24#sync)

原阅读：[VictoriaMetrics 的 sync.Map 分析](https://victoriametrics.com/blog/go-sync-map)，历史源码：[Go 1.21.13 map.go](https://github.com/golang/go/blob/go1.21.13/src/sync/map.go)。
