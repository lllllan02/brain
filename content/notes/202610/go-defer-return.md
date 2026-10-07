---
title: "defer 能改变 Go 函数的返回值吗？"
category: "Go"
created_at: "2026-01-21"
updated_at: "2026-10-07"
tags: ["Go", "defer", "返回值"]
type: "concept"
---

`return` 先求值并设置返回结果，再执行已注册的 defer，最后把结果交给调用者。defer 能否改变结果，取决于它修改的是返回变量、普通局部变量，还是返回指针指向的对象。

以下为按语言规范推导的示例，未运行验证：

```go
func unnamed() int {
    x := 0
    defer func() { x++ }()
    return x // 结果已设为 0，修改局部 x 不再改变结果
}

func named() (x int) {
    defer func() { x++ }()
    return 0 // 先给返回变量 x 赋值，再执行 defer，返回 1
}

func pointer() *int {
    x := 0
    defer func() { x++ }()
    return &x // 指针值不变，所指对象在返回前变为 1
}
```

还要区分延迟调用与参数求值：`defer print(x)` 在注册时就确定参数值，而 `defer func() { print(x) }()` 中的闭包在执行时读取变量。多个 defer 按后注册先执行的顺序运行。

defer 注册在当前函数调用上，不会因离开普通代码块就执行。循环中反复 defer 可能让资源一直占用到函数返回；需要每轮释放时，可以把单轮工作封装成函数。

执行顺序见 [Go 规范：Defer statements](https://go.dev/ref/spec#Defer_statements)。panic 触发的展开与恢复见 [[go-panic-recovery|recover 的边界]]。
