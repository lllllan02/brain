---
title: "Unicode 与字符编码"
category: "计算机基础"
updated_at: "2026-10-07"
tags: ["Unicode", "UTF-8", "编码"]
aliases: ["Unicode", "码点"]
---

**Unicode 为字符定义码点，UTF-8、UTF-16 等编码再把码点表示成字节或编码单元**。同一文本的字节数、码点数与用户看到的字符数往往不等：

- 码点（code point）：Unicode 给字符的编号，如 `é` 是 `U+00E9`；
- 字节：存储与传输单位，UTF-8 下一个字符占 1 至 4 字节；
- 字素簇（grapheme cluster）：用户感知的一个字符，可能由多个码点组成，例如 `é` 也可写作 `e` + `U+0301`。

UTF-8 用 1 至 4 字节编码码点、兼容 ASCII，但合法与否要完整校验，不能只数前导 1；U+0000 会编码为零字节。UTF-16 用一个或两个 16 位单元，超出基本多文种平面的值需要代理对（surrogate pair），解释前须明确字节序。乱码排查沿输入、解码、内部处理、重新编码、展示逐步定位；[[go-strings|Go 字符串]] 按字节保存，不自动验证 UTF-8。术语以 [Unicode FAQ](https://www.unicode.org/faq/utf_bom.html) 为准。
