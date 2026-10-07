---
title: "Go 接口为什么会出现“不是 nil 的空指针”？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "接口", "nil"]
type: "concept"
aliases: ["interface", "typed nil"]
---

接口值包含动态类型与动态值。只有两者都为空时，接口才等于 nil；把一个 nil 指针装入接口后，动态类型已经存在，因此接口不等于 nil。

这对 error 返回值尤其重要。若函数声明返回 `error`，成功时应明确 `return nil`；返回一个值为 nil 的 `*MyError` 会生成带动态类型的非 nil 接口。调用其方法是否 panic，还取决于方法能否处理 nil 接收者。

## 比较的是动态内容

两个接口相等，需要动态类型相同、动态值相等。动态类型不可比较时可能 panic，例如两边都装入 `[]int`；结构体中含接口字段时，也可能在比较该字段的动态值时失败。不能把“结构体允许写 ==”理解为其所有运行时比较都安全。

slice、map、函数只允许与 nil 比较，不能用 `==` 比较内容。选择 `slices.Equal`、`maps.Equal` 或 `reflect.DeepEqual` 前，应明确业务等价关系：nil 与空集合是否相同、浮点 NaN 如何处理、指针按身份还是按内容比较。DeepEqual 并不是通用的业务相等定义。

接口通过方法集合约束行为，具体类型无需显式声明 implements。值接收者与指针接收者影响方法集合；结构体嵌入的方法提升属于 [[composition-and-polymorphism|组合机制]]，不等同于类继承。

依据：[Go FAQ：nil error](https://go.dev/doc/faq#nil_error)、[Go 规范的比较运算](https://go.dev/ref/spec#Comparison_operators)。
