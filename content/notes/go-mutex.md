---
title: "Go 互斥锁（Mutex）"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "Mutex", "并发"]
aliases: ["sync.Mutex", "读写锁"]
---

**Mutex（sync.Mutex）是一把互斥锁，让同一段状态同一时刻只被一个 goroutine 访问。** 它保护的是一组必须同时成立的状态约束：所有访问者都要遵守同一套加锁协议，只锁写不锁读、或把读和修改分开加锁，都可能破坏约束。

## 怎么用

```go
mu.Lock()
// 修改受保护的共享状态
mu.Unlock()
```

几条要点：

- 零值可直接用，不用初始化。
- 用过之后不能复制；也不可重入——同一个 goroutine 再次 Lock 自己持有的锁会阻塞。
- 锁可以由另一个 goroutine 解锁，但程序要自己保证交接协议清楚。RWMutex 也不能把读锁直接升级成写锁；读多是否更快需要实测。
- 持锁期间别做慢 I/O 或不受控的工作，否则会拉长所有等待者的延迟，应尽量缩小临界区。

竞争激烈时的调度策略见 [[go-mutex-contention|Mutex 的竞争处理]]。参考：[sync.Mutex](https://pkg.go.dev/sync#Mutex)。
