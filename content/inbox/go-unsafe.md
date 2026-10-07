---
title: "unsafe 为什么不能只凭一个地址整数操作内存？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "unsafe", "内存"]
type: "concept"
---

unsafe 可以绕过部分类型约束，但不会绕过对象生命周期、对齐和 GC 的规则。uintptr 是整数，不是保活指针；把指针转成整数保存，再过一段时间转回，并不是可靠的引用方式。

`Sizeof` 给出值本身的浅层大小，包含必要填充，不包括指针或 slice 引用的全部数据。`Alignof` 与 `Offsetof` 帮助理解布局，字段偏移不能简单按字段大小相加。具体数值随架构和类型变化。

官方允许的 uintptr 转换模式有严格限制，常见指针运算要求转换与使用处于规定的同一表达式中。`runtime.KeepAlive` 不能把任意非法转换变合法，也不能修复越界或错误对齐。优先使用 `unsafe.Add` 等表达意图更明确的 API，仍需保证地址位于有效对象范围。

`unsafe.Slice`、`unsafe.String` 等构造视图时，调用者负责长度、存活期与别名关系。字符串视图存活时不能修改其底层字节；临时缓冲区放回 [[go-pool|对象池]] 后再保留该视图，会破坏这一条件。空 slice 的数据地址也不能作为是否分配或对象身份的可靠判断。

不要手工构造 reflect.StringHeader、SliceHeader 来制造引用。优化应有实际测量依据，并明确谁拥有内存、谁可以修改、何时失效。

依据：[unsafe.Pointer 的合法模式](https://pkg.go.dev/unsafe#Pointer)。
