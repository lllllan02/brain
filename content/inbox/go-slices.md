---
title: "Go 切片（Slice）"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "切片", "内存"]
aliases: ["slice", "Go 切片"]
---

**切片（slice）是底层数组上一段元素的视图**，可以理解成「数组引用 + 长度 + 容量」：长度限定当前能索引的元素，容量限定从起点向后能重新切到多远。两个 slice 可能共享同一块数组。

下面是按语言规则推导的示例，未运行：

```go
a := []int{10, 20, 30, 40}
s := a[1:3]        // len=2，cap=3
s[0] = 99         // a[1] 也变为 99
s = s[:3]         // 可以扩到容量，得到 99、30、40
t := a[1:3:3]     // len=2，cap=2
t = append(t, 50) // 必须使用另一块数组，不会覆盖 a[3]
```

完整切片表达式 `a[low:high:max]` 把容量设为 `max-low`：它限制后续 append 的复用范围，却不复制、不释放原数组，已有元素仍然共享。真正分离需要分配并复制，指针元素也只是浅复制。

## append 为什么要接收返回值

容量够时，append 在原数组上写入；容量不够时，[[go-slice-growth|扩容]] 会分配新数组并复制。无论是否扩容，返回 slice 的长度都可能变化，所以必须使用返回值，不能让程序正确性依赖某次 append 恰好复用了数组。

nil slice 的 len 和 cap 都是 0；非 nil 的空 slice 长度为 0，但容量可以大于 0。两者都能 append、range。标准库 `encoding/json` 的传统行为会把 nil slice 编成 `null`，非 nil 空 slice 编成 `[]`；`[]byte` 等特殊编码另论。

很短的 slice 也可能保留很大的数组，见 [[go-memory-retention|引用造成的内存滞留]]。基本模型来自 [Go Slices: usage and internals](https://go.dev/blog/slices-intro)。
