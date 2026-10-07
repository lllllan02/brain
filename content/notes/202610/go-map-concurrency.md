---
title: "Go map 怎样保证并发安全？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "并发", "map"]
type: "concept"
aliases: ["Go Map 并发安全"]
---

Go 原生 `map` 在没有任何并发修改时可以并发读取；无同步的读写或写写会产生数据竞争，并可能触发运行时致命错误。没有报错也不能证明安全。是否默认加锁由使用者决定，因为锁还可能需要保护 map 与其他字段之间的业务约束。

## 按操作边界选择同步方式

| 方式 | 适用条件 | 代价与边界 |
|---|---|---|
| `map` + `Mutex/RWMutex` | 通用对象、复合操作、类型约束 | 锁要覆盖完整逻辑；读多也不代表 RWMutex 必然更快 |
| [[go-sync-map\|sync.Map]] | 写一次读多次，或并发操作较独立的键集合 | 单个方法并发安全；多步业务操作仍需原子方法或额外协调 |
| 单 goroutine + channel | 状态由一个执行者持有 | 请求串行化，需要处理队列、超时与背压 |
| Copy-On-Write + atomic | 读极多、写极少、数据量可控 | 复制后原子发布不可变快照；多个写者仍需协调，避免覆盖 |

「先读取再增加」必须放在同一临界区，不能把分别加锁的 Get、Set 拼起来就认为整个操作安全。map 内存放指针时，容器同步也不会自动保护指针指向的对象。

Go 1.24 将 `sync.Map` 改为并发 Hash Trie。旧版的 read/dirty 双表和 misses 晋升只能作为历史实现理解，不能拿来解释所有版本。

依据：[Go FAQ](https://go.dev/doc/faq#atomic_maps)、[Go 1.24 sync 变更](https://go.dev/doc/go1.24#sync)。
