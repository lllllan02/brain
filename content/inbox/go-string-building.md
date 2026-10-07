---
title: "Go 拼接字符串怎样减少重复分配？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "字符串", "性能"]
---

字符串不可变。循环中反复 `s += part` 可能一遍遍复制已有前缀；构造较大结果时，让可增长缓冲区累积内容，通常更容易控制分配和复制。

少量固定片段直接用 `+` 最清楚，编译器也可能合并构造。已有字符串集合并且需要分隔符时用 `strings.Join`；逐步写入文本时用 `strings.Builder`；需要可修改字节、读写接口或二进制处理时，考虑 `bytes.Buffer` 或字节切片。

已知最终大小可合理调用 Builder 的 Grow，但估计过大也会保留多余内存。使用过的 Builder 不能按值复制，也不支持无同步并发写。它对 String 与后续写入的处理由库维护，不能根据其内部共享自行修改底层字节。

整数转换可使用 strconv；复杂格式使用 fmt 往往更易读。不能只凭 API 名称判定性能排名，应使用相同输入规模与结果语义比较耗时、分配量，必要时结合 [[go-escape-analysis|逃逸分析]]。

接口约束见 [strings.Builder](https://pkg.go.dev/strings#Builder)。
