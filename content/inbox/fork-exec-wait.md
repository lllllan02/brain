---
title: "fork、exec 和 wait 怎样分工管理子进程？"
category: "操作系统"
updated_at: "2026-10-07"
tags: ["Linux", "fork", "exec", "僵尸进程"]
aliases: ["僵尸进程", "孤儿进程"]
---

fork 创建子进程，exec 用新程序替换当前进程映像，wait 系列取得子进程状态并完成相应回收。创建、换程序与回收是三个不同动作。

fork 在父进程返回子 PID，在子进程返回 0，失败返回 -1。父子拥有各自的虚拟地址空间，常用写时复制延迟实际页面复制；但继承的 [[file-descriptors|文件描述符]] 可能指向相同 open file description，因此共享文件偏移等状态。

exec 成功后仍是原来的进程身份，但代码、地址空间等被替换，不返回到原调用点；失败才返回错误。shell 可以先 fork，在子进程调整标准输入输出，再 exec，父进程按前后台任务规则等待。

## 僵尸与孤儿为什么不同

子进程已退出但父进程尚未读取退出状态，会留下僵尸记录。它不再执行程序，不能通过再发 kill 让它“继续退出”；需要父进程正确 wait。父进程先退出的存活子进程是孤儿，会被适用的 subreaper 或 PID 命名空间中的 init 接管，不一定是宿主机 PID 1。

`waitpid(..., WNOHANG)` 可非阻塞检查，0 表示没有可报告的子状态，不代表子进程成功结束。使用 SIGCHLD 通知时，信号可能合并，通常需循环回收所有已就绪子状态，并遵守信号处理函数限制。诊断僵尸应先修复回收协议，不把杀父进程当常规方案。

来源：[OSTEP 第 5 章](https://pages.cs.wisc.edu/~remzi/OSTEP/Chinese/05.pdf)、[Linux wait(2)](https://man7.org/linux/man-pages/man2/wait.2.html)。
