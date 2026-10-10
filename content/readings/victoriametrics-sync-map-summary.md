---
title: "VictoriaMetrics：sync.Map：双表机制与适用边界"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-10"
tags: ["Go", "sync.Map", "源码"]
aliases: ["sync.Map read dirty"]
parent: victoriametrics-go-concurrency
source: "[Go sync.Map: The Right Tool for the Right Job](https://victoriametrics.com/blog/go-sync-map/)，VictoriaMetrics"
---

**原文以旧版 read/dirty 双表解释 sync.Map 如何减少读路径锁竞争，并说明它为何不能替代所有 map 加锁方案。**

## 双表如何降低竞争

read 提供快速查找；未找到且可能有新键时，再加锁查 dirty。慢路径访问积累后，dirty 晋升为 read，减少后续加锁查询。

两张表共享 entry，值通过原子指针更新，因此 read 并不意味着其中的值永远不变。删除会先改变 entry 状态，再随表转换清理；新增键和重建 dirty 则仍有额外成本。

## 机制与接口分别有哪些边界

适不适合取决于键的访问方式和实际负载，不能只看读写比例。[[go-sync-map|单个方法并发安全]]不意味着“先检查再写入”等多步流程原子，`Range` 也不是一致快照。

**这是历史实现：[Go 1.24 已改用并发哈希 Trie](https://go.dev/doc/go1.24#sync)。** 原文适合学习旧双表的设计取舍，不能据此描述当前所有版本的内部结构。
