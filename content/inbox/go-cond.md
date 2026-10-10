---
title: "Go 条件变量（sync.Cond）"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "sync.Cond", "条件变量"]
aliases: ["Cond", "sync.Cond"]
---

**Cond（sync.Cond）是条件变量，让 goroutine 在某个共享条件成立前挂起等待、条件变化时被唤醒。** 它把共享状态的锁和等待通知组合在一起，使用约束来自条件变量。

## 怎么用

等待方必须在锁保护下、用循环反复检查条件：

```go
c.L.Lock()
for !condition() {
    c.Wait()
}
// 在锁内使用满足条件的状态。
c.L.Unlock()
```

几条要点：

- `Wait` 在等待前释放 L、返回前重新加锁，所以返回后必须重新检查条件——用 `for` 而不是 `if`。
- `Signal` 唤醒一个等待者，`Broadcast` 唤醒全部；两者可以不持有 L，但共享状态的修改仍要正确同步。Signal 不保证被通知者优先拿到锁。
- Cond 首次使用后不能复制。
- 需要传递数据或组合取消时，[[go-channel-lifecycle|channel]]通常更易表达；Cond 本身没有带 Context 的 Wait。

接口约定：[sync.Cond](https://pkg.go.dev/sync#Cond)。`Wait` 为什么不丢通知见 [[victoriametrics-cond-summary|Cond 的等待队列]]。
