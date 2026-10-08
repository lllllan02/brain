---
title: "Go unsafe"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "unsafe", "内存"]
---

**unsafe 可以绕过部分类型约束，但绕不过对象生命周期、对齐和 GC 的规则。** uintptr 是整数、不是保活指针；把指针转成整数保存、过一段时间再转回，并不是可靠的引用方式。

`Sizeof` 给出值本身的浅层大小，含必要填充，不含指针或 slice 引用的全部数据。`Alignof`、`Offsetof` 帮助理解布局，字段偏移不能简单按字段大小相加；具体数值随架构和类型变化。

官方允许的 uintptr 转换模式有严格限制，常见指针运算要求转换和使用处在规定的同一表达式里。`runtime.KeepAlive` 不能把任意非法转换变合法，也修不了越界或错误对齐。优先用 `unsafe.Add` 这类意图更明确的 API，但仍要保证地址落在有效对象范围内。

`unsafe.Slice`、`unsafe.String` 构造视图时，调用者负责长度、存活期和别名关系。字符串视图存活时不能改底层字节；临时缓冲区放回 [[go-pool|对象池]] 后再保留该视图，就破坏了这一条件。空 slice 的数据地址也不能当作「是否分配」或「对象身份」的可靠判断。

不要手工构造 reflect.StringHeader、SliceHeader 来制造引用。优化要有实测依据，并明确谁拥有内存、谁可以修改、何时失效。

依据：[unsafe.Pointer 的合法模式](https://pkg.go.dev/unsafe#Pointer)。
