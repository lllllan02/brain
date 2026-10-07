---
title: "Go 切片怎样共享数组，len 与 cap 各限制什么？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "切片", "内存"]
type: "concept"
aliases: ["slice", "Go 切片"]
---

slice 是底层数组上一段元素的视图，可用数组引用、长度和容量理解。长度限定当前可索引的元素，容量限定从起点向后可重新切片的范围；两个 slice 可能共享同一块数组。

下面是按语言规则推导的示例，未运行：

```go
a := []int{10, 20, 30, 40}
s := a[1:3]        // len=2，cap=3
s[0] = 99         // a[1] 也变为 99
s = s[:3]         // 可以扩到容量，得到 99、30、40
t := a[1:3:3]     // len=2，cap=2
t = append(t, 50) // 必须使用另一块数组，不会覆盖 a[3]
```

完整切片表达式 `a[low:high:max]` 把容量设为 `max-low`。它限制后续 append 的复用范围，却不会复制或释放原数组；已有元素仍然共享。真正分离需要分配并复制，且指针元素的复制仍是浅复制。

## append 为什么要接收返回值

容量足够时，append 可以在原数组写入；容量不足时，[[go-slice-growth|扩容]] 会分配新数组并复制。无论是否扩容，返回 slice 的长度都可能变化，因此应使用返回值。不要让程序正确性依赖某次 append 恰好复用了数组。

nil slice 的长度和容量都是 0；非 nil 的空 slice 长度为 0，但容量可以大于 0。两者都可 append、range。标准库 `encoding/json` 的传统行为会把 nil slice 编为 `null`，非 nil 空 slice 编为 `[]`；`[]byte` 等特殊编码另论。

短 slice 也可能保留很大的数组，见 [[go-memory-retention|引用造成的内存滞留]]。基本模型来自 [Go Slices: usage and internals](https://go.dev/blog/slices-intro)。
