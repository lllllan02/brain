---
title: "sync.Cond 如何等待状态变化而不丢通知？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "sync.Cond", "条件变量"]
---

sync.Cond 把共享状态的锁与等待通知组合起来，适用于反复等待某个条件并选择唤醒一个或全部 goroutine。其使用约束来自[[condition-variables|条件变量]]：检查与修改状态遵循同一锁协议，等待返回后再次检查。

下面是等待方的用法示例，condition 必须在锁保护下读取共享状态：

```go
c.L.Lock()
for !condition() {
    c.Wait()
}
// 在锁内使用满足条件的状态。
c.L.Unlock()
```

Wait 在等待前释放 L，返回前重新加锁。Signal 唤醒一个等待者，Broadcast 唤醒全部等待者；两者可以不持有 L，但共享状态的修改仍需正确同步。Signal 不保证被通知者优先取得锁。Cond 首次使用后不能复制。[标准库接口约定](https://pkg.go.dev/sync#Cond)

## 领号与入队之间怎样避免丢通知

原资料所分析的 runtime 实现使用 notifyList：Wait 先取得票号，再解锁并尝试进入等待队列。Signal 推进已通知的票号范围；等待者真正入队前若发现自己的票号已经被覆盖，就直接继续，无须再睡眠。这样可以处理「已登记等待，但还没进入队列时通知到达」的时序。

票号顺序不等于队列入队顺序，也不等于 goroutine 最终运行顺序。copyChecker 则记录自身地址以检测使用后复制。这些是具体源码实现，不是业务应依赖的调度保证。

需要传递数据或组合取消时，[[go-channel-lifecycle|channel]]通常更易表达；关闭 channel 只发生一次，Cond 可以针对共享状态反复广播。Cond 本身没有带 Context 的 Wait，需要额外设计取消状态与唤醒协议。

原资料：[VictoriaMetrics 的 sync.Cond 解析](https://victoriametrics.com/blog/go-sync-cond/)。
