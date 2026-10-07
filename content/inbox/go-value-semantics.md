---
title: "Go 按值传递，为什么函数仍能修改外部数据？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "参数传递", "指针"]
aliases: ["Go 值传递", "new 与 make"]
---

Go 的赋值和传参都会复制值。复制指针、slice 或 map 时，复制的是包含引用的信息，因此两个值仍可能访问同一对象；这不意味着函数获得了调用者变量本身。

数组和结构体按整体复制，其中的指针字段仍指向原对象。[[go-slices|slice]] 复制描述信息后共享底层数组，修改元素可以被调用者看到；函数内重新切片或 append 改变的长度、容量和数组引用，却只属于局部副本，需要返回新 slice 才能更新调用者。[[go-maps|map]] 的元素修改也会共享，但把形参重新赋成另一个 map 不会替换外部变量。

[[go-closures-loops|闭包]] 捕获变量时，还要区分变量本身与它当前保存的引用。

要修改调用者的变量，可以传入指向它的指针，或明确返回新值。即使传了指针，函数内 `p = other` 也只改了局部指针；`*p = value` 才是修改指向的位置。

`new(T)` 得到指向 T 零值的指针；`make` 初始化 slice、map、channel，返回相应类型的值。`new([]int)` 指向 nil slice，仍可通过 `*p = append(*p, 1)` 使用；nil map 可以读，写入前则需要初始化。分配在栈还是堆由 [[go-memory-allocation|编译器与运行时]] 决定。

空结构体 `struct{}` 的值大小为零，可用于 `map[T]struct{}` 表示集合、`chan struct{}` 表示信号，以及实现无状态类型的方法。零大小元素不等于容器和通信零成本：map、channel、slice 描述信息与同步仍有开销；不同零大小变量的指针可能相等，也可能不等，不能依赖 zerobase 推断对象身份。[Go 规范：大小与对齐](https://go.dev/ref/spec#Size_and_alignment_guarantees)

这一模型也是 [Go slice 官方说明](https://go.dev/blog/slices) 中解释 append 必须返回结果的基础。
