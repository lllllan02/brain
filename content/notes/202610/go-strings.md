---
title: "Go 的 string、byte 和 rune 分别表示什么？"
category: "Go"
updated_at: "2026-10-07"
tags: ["Go", "字符串", "Unicode"]
type: "concept"
aliases: ["string byte rune"]
---

string 是不可变的字节序列，byte 是 uint8 的别名，rune 是 int32 的别名，通常用来表示 Unicode 码点。string 可以包含任意字节，不保证内容是合法 UTF-8。

`len(s)` 返回字节数，`s[i]` 取一个字节；`range s` 按 UTF-8 解码，返回字节偏移与 rune。遇到非法编码会产生 RuneError 并按规则前进，不应把这种解码结果当作原始字节的无损副本。

转换为 `[]rune` 便于按码点处理，但需要解码和存储，也不等于按用户看到的字符处理。组合字符与 emoji 序列需要 [[unicode-encoding|字素簇]] 层面的规则。rune 的底层类型还能容纳非法码点，类型本身不负责校验。

普通 `[]byte(s)` 与 `string(b)` 转换在语义上保证后续修改字节切片不会改变字符串；编译器可以在不改变可观察结果时优化复制。通过 [[go-unsafe|unsafe]] 绕过复制，则要自己保证字符串存活期间底层字节不被修改。

字符串比较按字节，不自动进行 Unicode 规范化或语言相关排序。构造大量文本时，可根据输入形式选择 [[go-string-building|拼接方式]]。

来源：[Strings, bytes, runes and characters in Go](https://go.dev/blog/strings)。
