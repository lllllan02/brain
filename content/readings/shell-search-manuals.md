---
title: "Shell 与 grep 官方文档导读：匹配规则和执行边界"
category: "开发工具"
tags: ["Shell", "文件搜索", "正则表达式"]
created_at: "2026-10-13T17:21:13+08:00"
updated_at: "2026-10-13T17:21:13+08:00"
source:
  - "[Bash：Filename Expansion](https://www.gnu.org/software/bash/manual/html_node/Filename-Expansion.html)"
  - "[Bash：Pattern Matching](https://www.gnu.org/software/bash/manual/html_node/Pattern-Matching.html)"
  - "[GNU Grep 手册](https://www.gnu.org/software/grep/manual/grep.html)"
  - "[Zsh：Filename Generation](https://zsh.sourceforge.io/Doc/Release/Expansion.html#Filename-Generation)"
read: false
---

**Shell 的文件名展开决定传给命令哪些路径；grep 的匹配规则决定输入中的哪些行被选中。** 本导读仅节选 Bash、Zsh 与 GNU Grep 手册中支持入门搜索的部分，不涵盖完整 Shell 语法与正则表达式。

## Shell 在命令运行前展开路径

Bash 的 [Filename Expansion](https://www.gnu.org/software/bash/manual/html_node/Filename-Expansion.html) 说明：未被引号保护的 `*`、`?`、`[` 可以触发文件名展开，匹配结果替换原参数。因此 `grep 'ERROR' logs/*.log` 中，Shell 先生成文件列表，grep 随后才读取这些文件。加引号的 `'logs/*.log'` 则作为一个普通参数传入。

[Pattern Matching](https://www.gnu.org/software/bash/manual/html_node/Pattern-Matching.html) 定义 `*` 匹配任意长度字符串，`?` 匹配单个字符，`[...]` 匹配集合中的一个字符。路径展开中，普通 `*` 不跨越 `/`；默认不匹配路径分量开头的 `.`。Bash 开启 `globstar` 后，`**/` 才能匹配零层或多层目录。

无匹配结果的行为取决于 Shell 配置：Bash 默认保留原模式，开启 `nullglob` 会删除该参数，开启 `failglob` 会报错。[Zsh 的文件名生成与递归规则](https://zsh.sourceforge.io/Doc/Release/Expansion.html#Filename-Generation) 则规定，默认无匹配会报错，`**/` 可递归匹配目录。这些差异意味着同一个 glob 不能脱离执行它的 Shell 或工具解释。

## grep 的输入与匹配模式

[grep Programs](https://www.gnu.org/software/grep/doc/html_node/grep-Programs.html) 将 grep 定义为逐行查找匹配的程序，默认输出整条匹配行。给出文件参数时读取文件；未指定文件且未要求递归时读取标准输入，因此可以接收管道传来的文本。

默认模式是基本正则表达式；`-E` 使用扩展正则表达式，`-F` 按固定字符串匹配。这里的「固定」指符号按字面理解，仍可匹配行中的一部分。正则的 [Fundamental Structure](https://www.gnu.org/software/grep/manual/html_node/Fundamental-Structure.html) 中，`.` 表示任意单个字符，`*` 表示前一项重复零次或多次；所以 `.*` 与 glob 的 `*` 语义相近，但二者属于不同语法。

## 搜索范围与输出分别控制

[File and Directory Selection](https://www.gnu.org/software/grep/manual/html_node/File-and-Directory-Selection.html) 中，`-r` 递归读取目录，`--include='*.log'` 用 glob 限定文件名。此处引号让模式完整传给 grep，再由 grep 解释；Shell 不负责展开这个模式。GNU grep 的 `-r` 跳过递归途中遇到的符号链接，`-R` 会跟随它们，二者不宜混为一谈。

[Matching Control](https://www.gnu.org/software/grep/manual/html_node/Matching-Control.html) 中的 `-i` 忽略大小写；[Output Line Prefix Control](https://www.gnu.org/software/grep/manual/html_node/Output-Line-Prefix-Control.html) 中的 `-n` 添加从 1 开始的行号，`-H` 强制显示文件名；[General Output Control](https://www.gnu.org/software/grep/manual/html_node/General-Output-Control.html) 中的 `-l` 只列出有匹配的文件名，`-c` 统计匹配行数。它们改变匹配或输出方式，不应与文件名筛选混淆。

[Exit Status](https://www.gnu.org/software/grep/manual/html_node/Exit-Status.html) 区分有匹配、无匹配和错误：常规调用分别返回 0、1、2，其他实现的错误码也可能大于 2。没有输出不等于程序出错，也不能在出现读取错误时认定已完整查过所有文件。
