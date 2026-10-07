---
title: "一个 goroutine panic 会影响其他 goroutine 吗？"
category: "Go"
created_at: "2026-01-17"
updated_at: "2026-10-07"
tags: ["Go", "panic", "recover"]
---

某个 goroutine 的 panic 如果一直没有被恢复，会在展开该 goroutine 的调用栈、执行其 defer 后终止整个程序。其他 goroutine 不会因此获得可靠的清理机会。

`recover` 必须由正在 panic 的同一个 goroutine 中的 deferred function 直接调用。父 goroutine 无法在自己的 defer 中捕获子 goroutine 的 panic；新建 goroutine 时，需要在它自己的入口设置恢复边界。

恢复成功后，不会回到发生 panic 的那一行继续运行。执行恢复的 defer 所属函数结束，控制权返回其调用者。示意代码如下，未连接实际任务执行系统：

```go
func runTask() (err error) {
    defer func() {
        if v := recover(); v != nil {
            err = fmt.Errorf("task panicked: %v", v)
        }
    }()
    doTask()
    return nil
}
```

实际恢复边界应记录堆栈并明确返回失败，不能吞掉 panic 后继续报告成功。若业务状态已被部分修改，还需要回滚或隔离。并发 map 访问等运行时 fatal error 也不能靠 recover 通用兜底，正确同步见 [[go-map-concurrency|Go map 并发访问]]。

规则见 [Go 规范：Handling panics](https://go.dev/ref/spec#Handling_panics)。正常停机的资源清理应使用 [[go-graceful-shutdown|有期限的退出流程]]，不能依赖其他 goroutine 在崩溃时执行 defer。
