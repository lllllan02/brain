---
title: "glob 与 grep 入门"
category: "开发工具"
tags: ["Shell", "文件搜索", "正则表达式"]
created_at: "2026-10-13T17:21:13+08:00"
updated_at: "2026-10-13T17:21:13+08:00"
learning_status: pending
---

在项目里找资料，通常有两个问题：**「哪些文件名符合条件？」** 和 **「哪些文件里包含需要的文字？」** glob 处理前者，grep 处理后者；把它们组合起来，就能先缩小文件范围，再定位具体内容。

**glob 是一种通配符匹配规则，常用于匹配文件名和路径。** 在终端中，它通常由 Shell（解释和执行命令的程序，例如 Bash、Zsh）处理，不必运行一个叫 `glob` 的命令。

**grep 是一个文本搜索命令，用于从文件或输入文本中选出符合条件的行。** 它可以搜索普通文字，也可以用正则表达式（Regular Expression，描述文本模式的规则）搜索。

以下沿用一组日志文件讲解。规则依据见 [[shell-search-manuals|Shell 与 grep 官方文档导读]]；示例输出在 macOS 的 Zsh 与系统 BSD grep 上验证，涉及 Bash 的差异单独注明。

## 先准备一组能实际搜索的文件

可以在终端执行下面的命令，创建临时练习目录并进入其中。`mkdir -p` 创建目录；`printf` 输出文字，`\n` 表示换行；`>` 把输出写入指定文件。

```sh
search_demo=$(mktemp -d)
cd "$search_demo"
mkdir -p logs/archive
printf 'INFO server started\nERROR database timeout\nWARN retry scheduled\n' > logs/app.log
printf 'INFO worker started\nerror task failed\n' > logs/worker.log
printf 'ERROR old failure\n' > logs/archive/old.log
printf 'ERROR explanation\n' > logs/notes.txt
```

其中 `search_demo` 保存新目录的路径，`$(...)` 取得命令的输出，`cd` 切换工作目录。后面的相对路径都从这个目录开始：

```text
logs/
├── app.log
├── worker.log
├── notes.txt
└── archive/
    └── old.log
```

## glob：只知道文件名的一部分，怎样找到它？

要列出 `logs` 目录下的 `.log` 文件，可以执行：

```sh
printf '%s\n' logs/*.log
```

输出：

```text
logs/app.log
logs/worker.log
```

这里 `logs/*.log` 是 glob 模式。`logs/` 指定目录，`*` 代表零个或多个字符，`.log` 要求文件名以这个后缀结束。`printf '%s\n'` 把每个传入的参数单独输出一行。

执行过程是：Shell 查看目录 → 把 `logs/*.log` 替换成两个匹配路径 → `printf` 输出这两个路径。**「匹配发生在命令执行前」**，所以 glob 也可以用于其他接收文件路径的命令。

| 模式 | 匹配规则 | 例子 |
| --- | --- | --- |
| `*.log` | 任意长度名称加 `.log` 后缀 | `app.log`、`worker.log` |
| `app?.log` | `?` 恰好匹配一个字符 | 匹配 `app1.log`，不匹配 `app12.log` |
| `app[12].log` | 方括号中任选一个字符 | 匹配 `app1.log`、`app2.log` |
| `logs/*/*.log` | 中间恰好一层目录 | 匹配 `logs/archive/old.log` |

普通 `*` 不跨越路径分隔符 `/`，所以 `logs/*.log` 没有包含 `archive/old.log`。在 Zsh 中，要包含零层或多层子目录，可用 `logs/**/*.log`；Bash 需要支持并开启 `globstar`，不能假定所有环境都默认支持。

## grep：文件找到了，怎样定位想看的内容？

`app.log` 有三行，若只想看包含 `ERROR` 的行：

```sh
grep -n 'ERROR' logs/app.log
```

输出：

```text
2:ERROR database timeout
```

可以把命令拆成三部分：`-n` 是选项，要求显示行号；`'ERROR'` 是搜索模式；`logs/app.log` 是输入文件。输出中的 `2` 是原文件行号，后面是整条匹配行。默认只要一行中有一处匹配，就选中该行，无须整行等于 `ERROR`。

grep 默认区分大小写。`worker.log` 中写的是小写 `error`，搜索大写 `ERROR` 不会命中。添加 `-i` 可以忽略大小写：

```sh
grep -ni 'error' logs/worker.log
```

输出为 `2:error task failed`。`-ni` 是 `-n -i` 的合写形式。

## 组合使用：只搜索日志文件里的错误

```sh
grep -n 'ERROR' logs/*.log
```

Shell 先展开 glob，效果相当于运行：

```sh
grep -n 'ERROR' logs/app.log logs/worker.log
```

grep 再读取这两个文件，得到：

```text
logs/app.log:2:ERROR database timeout
```

多个输入文件时，输出通常带上文件名，依次是「文件路径 : 行号 : 内容」。虽然 `notes.txt` 也包含 `ERROR`，但它没有被 glob 选中，因此不会被搜索。`archive/old.log` 则因为不在这一层目录中而被排除。

如果想搜索所有子目录中的 `.log` 文件，可以让 grep 自己递归：

```sh
grep -rn --include='*.log' 'ERROR' logs/
```

`-r` 表示继续搜索子目录，`--include='*.log'` 限定文件名，`'ERROR'` 限定文件内容。练习目录中会命中 `app.log` 第 2 行和 `archive/old.log` 第 1 行，输出顺序不作保证。该写法适用于 GNU grep，也已在本机 BSD grep 验证。

**「同一条命令可以同时使用 glob 和正则表达式，它们各自处理不同的条件。」** 这里的 `*.log` 由 grep 的文件筛选功能解释，而不是由 Shell 展开。

## 为什么有时加引号，有时不加？

引号决定 Shell 是否先处理通配符。比较：

```sh
printf '%s\n' logs/*.log
printf '%s\n' 'logs/*.log'
```

第一条输出匹配到的路径；第二条只输出原样文字 `logs/*.log`。因此：

- `grep 'ERROR' logs/*.log`：路径模式不加引号，让 Shell 展开成文件列表。
- `grep -r --include='*.log' 'ERROR' logs/`：文件筛选模式加引号，让 grep 收到完整的 `*.log`。
- 搜索内容通常写在单引号内，避免空格、`*`、`$` 等先被 Shell 解释。

引号只控制 Shell 这一层。`grep 'a.b' file.txt` 中的点仍会被 grep 当作正则符号。若要按原样寻找 `a.b`，使用 `grep -F 'a.b' file.txt`；`file.txt` 需换成实际文件。**「加引号」与「按字面搜索」是两件事。**

## grep 的正则表达式与 glob 有什么不同？

正则表达式用于描述内容的形状。例如找出以 `ERROR` 或 `WARN` 开头的日志：

```sh
grep -nE '^(ERROR|WARN)' logs/app.log
```

输出：

```text
2:ERROR database timeout
3:WARN retry scheduled
```

`-E` 启用扩展正则表达式；`^` 表示行首；括号把两个候选组合起来；`|` 表示「或者」。这些符号共同表达一个条件。

最容易混淆的是 `*`：

| 写法 | 在 glob 中 | 在 grep 正则中 |
| --- | --- | --- |
| `*` | 任意长度字符串 | 前一项重复零次或多次 |
| `.` | 普通点号 | 任意单个字符 |
| `a*` | 以 `a` 开头的名称 | 零个或多个连续的 `a` |
| `.*` | 以点开头的名称 | 任意长度字符序列 |

因此，搜索行中包含 `ERROR`，直接写 `grep 'ERROR' ...` 即可，不需要写成 glob 风格的 `*ERROR*`。只想寻找一段确定的文字时，优先用 `-F`，便可避免把点号、方括号等意外当成正则语法。

## 日常使用时怎样选？

| 需求 | 在练习目录中的命令 |
| --- | --- |
| 列出当前层的日志文件 | `printf '%s\n' logs/*.log` |
| 查文件里的文字及行号 | `grep -nF 'ERROR' logs/app.log` |
| 不区分大小写查文字 | `grep -niF 'error' logs/worker.log` |
| 只列出内容命中的文件名 | `grep -lF 'ERROR' logs/*.log` |
| 统计匹配行数 | `grep -cF 'ERROR' logs/app.log` |
| 搜索目录及其子目录中的日志 | `grep -rnF --include='*.log' 'ERROR' logs/` |

`-l` 虽然只输出文件名，但仍然通过读取内容作判断；`-c` 统计行数，同一行出现多次关键词也只算一行。grep 还可以接收其他命令通过管道 `|` 传来的文本，此时搜索的是收到的文本。

查不到结果时，先检查路径、大小写和匹配规则，再扩大范围。Shell 的普通 glob 默认会跳过 `.hidden.log` 这类隐藏名称；grep 自己递归时不能据此假定也会跳过它们。glob 无匹配时，默认 Zsh 会报 `no matches found`，默认 Bash 通常保留原模式；grep 没找到匹配行则通常安静退出，退出码为 1。这些情况的含义见 [[shell-search-manuals#Shell 在命令运行前展开路径|Shell 展开规则]] 与 [[shell-search-manuals#搜索范围与输出分别控制|grep 的搜索和返回规则]]。
