---
title: "Go new、make 与零值"
category: "Go"
created_at: "2026-10-08"
updated_at: "2026-10-08"
tags: ["Go", "内存", "零值"]
aliases: ["new 与 make", "Go 零值", "空结构体", "struct{}"]
---

**new(T) 分配一个 T 类型的零值并返回它的指针；make 只用于 slice、map、channel，初始化并返回该类型本身的值。**

- `new([]int)` 指向一个 nil slice，仍可用 `*p = append(*p, 1)` 使用。
- nil map 能读，写入前要先初始化；分配在栈还是堆由 [[go-memory-allocation|编译器与运行时]] 决定。
- 空结构体 `struct{}` 大小为零，可用于 `map[T]struct{}` 表示集合、`chan struct{}` 表示信号、以及实现无状态类型的方法。但零大小元素不等于容器和通信零成本：map、channel、slice 的描述信息与同步仍有开销，不同零大小变量的指针也可能相等或不等，不能靠它推断对象身份。

依据：[Go 规范：大小与对齐](https://go.dev/ref/spec#Size_and_alignment_guarantees)、[Go slice 官方说明](https://go.dev/blog/slices)。
