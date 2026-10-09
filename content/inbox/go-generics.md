---
title: "Go 泛型与类型约束"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "泛型", "类型约束"]
aliases: ["Go 类型参数", "类型约束"]
---

**类型参数的约束定义允许的类型集合，函数体只能用对这个集合都成立的操作。** 所以不能因为某次调用传入整数，就随意写整数运算。

Go 1.18 起的示意语法如下，未运行：

```go
type Integer interface { ~int | ~int64 }
func Sum[T Integer](xs []T) T {
    var total T
    for _, x := range xs { total += x }
    return total
}
```

`int` 只列入该类型，`~int` 还允许底层类型为 int 的自定义类型。`|` 表示类型集合的并集；`any` 不添加限制，因此不能仅凭 `T any` 使用 `+`。含类型项的非基本接口只能用于约束，不能直接当普通变量类型。

`comparable` 用于需要相等比较的参数，例如 map 键。从 Go 1.20 起，接口类型满足该约束有特殊规则；允许实例化不保证所有动态值都能比较，装入 slice 等仍可能 panic，边界见 [[go-interfaces|接口比较]]。

泛型适合容器和与具体类型无关的算法；面向行为的多种实现可以用接口，只有运行时才知道结构时才需要 [[go-reflection|反射]]。`[]T` 也不会自动变成 `[]any`，因为两种切片的元素表示不同。

2019 年泛型草案可用于了解设计动机，其历史语法不作为当前用法。参考 [Why Generics?](https://go.dev/blog/why-generics) 与 [Go 泛型入门](https://go.dev/doc/tutorial/generics)。
