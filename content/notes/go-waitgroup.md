---
title: "Go WaitGroup"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "WaitGroup", "并发"]
aliases: ["sync.WaitGroup"]
---

**WaitGroup（sync.WaitGroup）用来等待一组 goroutine 全部结束。** 它维护一个未完成任务计数，Add 增加、Done 减少，Wait 等到计数归零才返回。它只回答「任务结束了没」，不保护共享数据，也不传递错误或取消。

## 怎么用

典型的用法是「先 Add，再启动 goroutine，任务里 Done，最后 Wait」：

```go
var wg sync.WaitGroup
for _, task := range tasks {
    wg.Add(1)
    go func(t Task) {
        defer wg.Done()
        t.run()
    }(task)
}
wg.Wait()
```

几条要点：

- **Add 要在 Wait 之前、启动 goroutine 之前调用**。先启动再 Add，可能让 Wait 先看到计数为零而提前返回。
- 任务里用 `defer wg.Done()`，可以覆盖普通返回和 panic 展开。
- 用过之后不能复制；复用下一批任务前，要确保上一批的 Wait 都已返回。
- 要取消还没完成的任务，得另传 [[go-context|context]]；等到取消信号也不等于已经回收全部 goroutine。
- Go 1.25 起可用 `WaitGroup.Go` 把启动和计数合并，传入的函数不能 panic，使用时要确认项目版本。

计数与唤醒的内部衔接见 [[go-waitgroup-internals|WaitGroup 的实现细节]]。接口约定：[sync.WaitGroup](https://pkg.go.dev/sync#WaitGroup)。
