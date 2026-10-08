---
title: "缓存读写模式"
category: "缓存设计"
updated_at: "2026-10-08"
tags: ["缓存", "Cache Aside", "Read Through", "Write Back"]
aliases: ["Cache Aside", "Read Through", "Write Through", "Write Back"]
---

**缓存模式主要区分两件事：谁负责加载数据、写入成功时承诺数据已经到哪里。** 名字不决定一致性强弱，也不保证缓存命中。

| 模式 | 主要职责与返回条件 |
| --- | --- |
| Cache Aside | 应用查缓存，未命中后自己读库回填；常见写法是先改库、再失效缓存 |
| Read Through | 应用向缓存层读，由缓存层或它的 loader 在未命中时加载后端 |
| Write Through | 写路径由缓存层协调向后端写，通常在后端写成功后确认 |
| Write Back | 先写缓存、再异步写回后端，也叫 Write Behind |

- **Read Through** 把回源责任封装起来，但后端仍是权威存储。loader 可以合并同 key 的并发加载，实例内合并不等于覆盖整个分布式集群；过期、刷新、后端故障仍要处理。
- **Write Through** 缩短了应用直接双写的路径，但仍可能一侧成功一侧失败，读路径也可能绕过缓存——它不能凭名字提供跨系统原子性。陈旧窗口见 [[cache-consistency|缓存与数据库的一致性]]。
- **Write Back** 把持久化放到确认之后，能合并频繁修改，但「已确认」的数据必须有符合要求的持久保障。要定义脏数据能否淘汰、缓冲满时如何背压、失败重试、同 key 顺序、崩溃后如何恢复；读数据库也可能暂时落后于缓存。

选型从「可接受多少丢失与陈旧」出发。对库存、余额这类关键约束，不能因为缓存写得快就把它当可靠事务边界。

原阅读资料：[缓存读写模式与数据一致性](https://mp.weixin.qq.com/s/ch9nkjczSir4jN7hLP_R5A)。
