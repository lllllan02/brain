---
title: "Go string、byte 与 rune"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "字符串", "Unicode"]
aliases: ["string byte rune"]
---

**string 是不可变的字节序列，byte 是 uint8 的别名，rune 是 int32 的别名**（通常用来表示一个 Unicode 码点）。string 可以装任意字节，不保证内容是合法 UTF-8。

`len(s)` 返回字节数，`s[i]` 取一个字节；`range s` 按 UTF-8 解码，返回字节偏移和 rune。遇到非法编码会产生 RuneError 并按规则前进，不能把这种解码结果当成原始字节的无损副本。

转成 `[]rune` 便于按码点处理，但要解码和额外存储，也不等于按「用户看到的字符」处理——组合字符、emoji 序列要按 字素簇 的规则切。rune 的底层类型还能装非法码点，类型本身不负责校验。

普通 `[]byte(s)` 和 `string(b)` 转换在语义上保证「之后改字节切片不影响字符串」；编译器可以在不改变可观察结果时省略复制。用 [[go-unsafe|unsafe]] 绕过复制，就要自己保证字符串存活期间底层字节不被改。

字符串比较按字节，不自动做 Unicode 规范化或语言相关排序。大量拼接时可按输入形式选择合适的拼接方式。

来源：[Strings, bytes, runes and characters in Go](https://go.dev/blog/strings)。
