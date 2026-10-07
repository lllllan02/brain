---
title: "Unicode 码点、编码和用户看到的字符有什么区别？"
category: "计算机基础"
updated_at: "2026-10-07"
tags: ["Unicode", "UTF-8", "编码"]
type: "concept"
aliases: ["Unicode", "码点", "字符编码"]
---

Unicode 为字符等文本元素定义码点，UTF-8、UTF-16 等编码把这些值表示为字节或编码单元。用户看到的一个字符还可能由多个码点组成，因此字节数、码点数和显示字符数不能混用。

例如 `é` 可以表示为一个预组合码点，也可以表示为 `e` 加组合重音。它们可以看起来相同，但原始字节不同；是否做规范化，应由搜索、标识符或存储协议明确约定。emoji 序列同样可能包含多个码点。

UTF-8 用 1 至 4 字节编码 Unicode 标量值，兼容 ASCII。首字节与续字节的前缀区分编码单元，但只数前导 1 不足以校验合法性，还需排除过长编码、代理码点和越界值。U+0000 仍编码为零字节，UTF-8 并不保证“不会出现 NUL”。

UTF-16 用一个或两个 16 位编码单元，超出基本多文种平面的标量值需要代理对。把字节流解释成 UTF-16 时要明确字节序；BOM 是可用的标记之一，不能假定所有文本都自带编码说明。`wchar_t` 的宽度也取决于平台，不是可移植的统一 Unicode 编码。

乱码排查应沿输入、解码、内部处理、重新编码、展示逐步定位。错误解码后再编码可能已经丢失信息；显示成方框也可能只是字体缺字。[[go-strings|Go 字符串]] 则按不可变字节序列保存，不自动验证 UTF-8。

原阅读来源：[Joel 的 Unicode 与字符集介绍](https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/)。术语以 [Unicode FAQ](https://www.unicode.org/faq/utf_bom.html) 为准。
