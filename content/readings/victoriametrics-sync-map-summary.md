---
title: "VictoriaMetrics：sync.Map：双表机制与适用边界"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-10"
tags: ["Go", "sync.Map", "源码"]
aliases: ["sync.Map read dirty"]
parent: victoriametrics-go-concurrency
---

**文章以 read/dirty 双表解释 sync.Map 如何减少读路径锁竞争，同时指出它不能替代所有 map 加锁方案。**

原文：[Go sync.Map: The Right Tool for the Right Job](https://victoriametrics.com/blog/go-sync-map/)，VictoriaMetrics。

- read 提供快速查找，缺失且可能有新增键时加锁查 dirty；慢路径访问积累后，dirty 晋升为 read。
- 两表共享 entry，通过原子指针更新值；read 不意味着值永不改变。删除先标记，再在后续表转换中清理；expunged 不等于键已经从所有表消失。
- 新键、删除与表重建会带来额外成本，选型需看访问模式和实际负载，不能只靠读写比例。
- 单个方法的并发安全不等于多步操作的原子性；`Range` 也不是一致快照，接口边界见 [[go-sync-map|sync.Map]]。

**版本边界**：这是旧双表实现；[Go 1.24 已改用并发哈希 Trie](https://go.dev/doc/go1.24#sync)。原文 How sync.Map Works 及后续增删查章节适合了解旧实现。
