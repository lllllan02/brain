---
title: "信号量（Semaphore）"
category: "并发编程"
updated_at: "2026-10-07"
tags: ["信号量", "同步", "有界队列"]
aliases: ["Semaphore"]
---

**信号量（semaphore）是一种同步原语，用来保存可获取的许可数量**：wait 取走一个许可，不足时等待；post 归还或增加许可，并唤醒等待者。与 [[condition-variables|条件变量]]不同，先 post 后 wait 的许可可以保留。初值 1 用于串行进入临界区，初值 0 用于等待某项工作完成；二值信号量的许可可由其他线程释放，不套用互斥锁的所有权规则。

容量 N 的有界队列可设 `empty=N`、`full=0`，并用互斥锁保护队列结构：生产者等 empty 后持锁入队、释放锁后增加 full，消费者反之。不能先持锁再等许可——队列空时消费者若拿着锁等 full，生产者无法取锁入队，就会 [[deadlocks|死锁]]。

教材把负值解释为等待者数量只是抽象模型，不代表所有 API 的可观察计数；还要处理等待被中断或取消后的许可归还。用信号量表达读写锁时，持续放行新读者可能饿死写者。来源：[OSTEP 第 31 章](https://pages.cs.wisc.edu/~remzi/OSTEP/Chinese/31.pdf)。
