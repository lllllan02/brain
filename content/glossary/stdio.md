---
title: "Stdio（标准输入输出）"
aliases: ["stdio", "Standard Input/Output", "标准输入输出"]
category: "计算机基础"
tags: ["进程通信"]
created_at: "2026-10-11"
source:
  - "https://docs.python.org/3/library/sys.html#sys.stdin"
---

**Stdio（Standard Input/Output，标准输入输出）是程序通过标准输入流和标准输出流读写数据的通用方式，本身不规定数据的格式或含义。**

程序通常有三条标准流：`stdin` 接收输入，`stdout` 输出正常结果，`stderr` 输出错误或诊断信息。在终端中，它们常连接键盘和屏幕，也可以重定向到文件，或通过管道连接其他程序。Python 的[标准流文档](https://docs.python.org/3/library/sys.html#sys.stdin)给出了对应接口与用途。

例如，命令 `printf 'hello\n' | cat` 把前一个程序的标准输出接到后一个程序的标准输入，`cat` 读到 `hello` 后再输出。
