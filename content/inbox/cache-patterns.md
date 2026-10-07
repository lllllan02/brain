---
title: "Cache Aside、Read Through 与写缓存模式有什么区别？"
category: "缓存设计"
updated_at: "2026-10-07"
tags: ["缓存", "Cache Aside", "Read Through", "Write Back"]
aliases: ["Cache Aside", "Read Through", "Write Through", "Write Back"]
---

缓存模式主要区分谁负责加载数据，以及写入成功时承诺数据已到哪里。名称不直接决定一致性强弱，也不保证缓存始终命中。

| 模式 | 主要职责与返回条件 |
| --- | --- |
| Cache Aside | 应用查缓存，未命中后自己读库并回填；常见写法是先改库再失效缓存 |
| Read Through | 应用向缓存层读取，由缓存层或其 loader 在未命中时加载后端 |
| Write Through | 写路径由缓存层协调向后端写入，通常在后端写入成功后确认 |
| Write Back | 先接收缓存中的修改，再异步写回后端；也称 Write Behind |

Read Through 把回源责任封装起来，不意味着后端不再是权威存储。loader 可以合并同 key 的并发加载，但实例内合并不会自动覆盖分布式集群；过期、刷新和后端故障仍需处理。

Write Through 缩短了应用直接双写的路径，却仍可能一侧成功、一侧失败，读路径也可能绕过缓存。它不能凭名称提供跨系统原子性。具体陈旧窗口见 [[cache-consistency|缓存与数据库一致性]]。

Write Back 把持久化放到确认之后，可以合并频繁修改，但已确认数据必须有符合要求的持久保障。要定义脏数据能否淘汰、缓冲满时如何背压、失败重试、同 key 顺序，以及进程崩溃后的恢复；读取数据库也可能暂时落后于缓存。

选型应从可接受的数据丢失与陈旧程度开始。对库存、余额等关键约束，不能因为缓存写入很快就把它直接当作可靠事务边界。

原阅读资料：[缓存读写模式与数据一致性](https://mp.weixin.qq.com/s/ch9nkjczSir4jN7hLP_R5A)。
