---
title: "Go fuzzing"
category: "Go"
updated_at: "2026-10-08"
tags: ["Go", "Fuzzing", "测试"]
type: "practice"
---

**fuzzing 在种子输入基础上自动生成变体，去寻找让程序崩溃或违反性质的输入。** 关键是先定义「什么算正确」，而不是只让工具持续调用函数。

测试函数接收 `*testing.F`，用 Add 提供正常值和边界种子，再用 Fuzz 注册目标。性质可以是「编解码往返后语义不变」「排序后有序且元素不丢」「解析器对非法输入返回明确错误」。不能把所有 error 都忽略，否则会掩盖「错误拒绝了合法输入」的问题。

以下是已有 `FuzzParse` 目标后的命令示例，未在本文执行：

```sh
go test ./...
go test -run='^$' -fuzz='^FuzzParse$' -fuzztime=30s .
```

普通 go test 执行种子和已保存的回归输入；启用 -fuzz 才持续探索新输入。失败输入会尝试最小化，并保存到测试语料目录，修复后由普通测试复现。

目标要确定、快速、彼此独立，不依赖生产数据库或不可控网络。处理文本时尤其要明确 [[unicode-encoding|非法 UTF-8 与字符单位]]：按 byte 反转、按 rune 反转、按字素簇反转是不同规格，fuzzer 找到非法编码并不自动说明哪一种规格正确。

来源：[Go fuzzing 教程](https://go.dev/doc/tutorial/fuzz)。
