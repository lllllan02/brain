---
title: "Azure 架构文档：Cache Aside 的一致性边界"
category: "缓存设计"
tags: ["缓存", "Cache Aside", "一致性"]
source:
  - "https://learn.microsoft.com/en-gb/azure/architecture/patterns/cache-aside"
  - "https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching"
created_at: "2026-10-13T11:03:37+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
---

这两份架构说明将缓存视为减少重复读取和计算的副本，并讨论如何在失效与容量约束下使用。以下节选通用模式，不展开 Azure 产品部署。

## 按需加载解决什么

[Cache-Aside pattern](https://learn.microsoft.com/en-gb/azure/architecture/patterns/cache-aside)描述由应用检查缓存，未命中时从数据存储读取并回填。写路径先更新存储再使缓存失效，避免先删缓存时另一个读取者立即填回数据库旧值。按需加载不要求预先缓存全部对象，但冷数据第一次访问仍需回源。

文档将过期、预热和淘汰作为同一容量问题讨论：TTL 太短会频繁读取后端，太长可能保留陈旧数据；**「不同对象的加载成本与访问频率不同」**，统一策略未必合适。它明确表示该模式不保证缓存与数据源始终一致，例如其他进程绕过应用更新数据库时，缓存未必收到通知。

## 多副本为何扩大陈旧窗口

[Caching guidance](https://learn.microsoft.com/en-us/azure/architecture/best-practices/caching)进一步指出：即使先使缓存失效，如果随后从尚未同步的数据库副本回填，**「旧值仍会再次进入缓存」**。缓存更新流程正确与读源足够新是两项独立条件。

本地缓存降低远程访问，但各进程各有副本；分布式缓存便于共享，又增加网络依赖。资料要求按数据敏感性保护缓存访问，并把重要数据保存在原始存储中，而非只保留于可消失的缓存。

这些说明支持按陈旧预算设计加载和失效。具体旧读回填交错、可靠失效事件与业务事务约束，还需结合[[cache-consistency|缓存一致性]]中的问题分别推演，不能从模式名称推导出跨数据库与 Redis 的原子提交。
