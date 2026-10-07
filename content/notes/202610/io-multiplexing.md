---
title: "select、poll 与 epoll 怎样等待多个连接？"
category: "操作系统"
updated_at: "2026-10-07"
tags: ["Linux", "I/O多路复用", "select", "poll"]
type: "concept"
aliases: ["I/O 多路复用"]
---

I/O 多路复用让线程在一个等待点关注多个 [[file-descriptors|文件描述符]]，发现就绪后再执行相应读写。它减少逐连接等待的需要，但不会自动执行耗时业务，也不保证所有负载都更快。

`select` 每次提交读、写、异常集合，内核检查它们并返回就绪集合。集合会被修改，下一轮通常需要重建。`nfds` 是最大 FD 加一，不是连接个数；常用 libc 的 `fd_set` 受 FD_SETSIZE 限制，通常只能表示小于 1024 的 FD，这不是进程总共只能打开 1024 个文件。[select(2)](https://man7.org/linux/man-pages/man2/select.2.html)

`poll` 提交描述符数组，通过 `events` 声明关注事件、`revents` 返回结果。它摆脱固定大小 fd_set 的限制，但每次仍要传入和扫描数组，并继续受资源与描述符限额约束。[poll(2)](https://man7.org/linux/man-pages/man2/poll.2.html)

[[epoll|epoll]] 把长期关注集合保存在内核，通过事件回调维护就绪项，每次等待主要取出可处理事件。因此在大量连接、少量活跃的场景中，可以减少反复搬运与扫描全部连接的成本。

这不意味着应用必须把 FD 排序后从 0 扫到最大值。select 的位图与 nfds 有表示和检查范围上的约束，应用仍可维护自己的活动 FD 列表。也不能把 epoll 的整体开销写成 O(1)：注册、返回事件数、锁竞争和实际读写都有成本。

[[event-loops|事件循环]] 应只做有界工作；一个就绪连接上的阻塞数据库调用会拖住同循环的其他连接。[[netty|Netty]] 与 [[nginx|Nginx]] 都需要处理这种执行与排队边界。
