---
title: "MySQL 分页优化资料导读"
category: "MySQL"
type: "article"
tags: ["索引", "SQL优化", "分页"]
created_at: "2026-10-12T18:04:41+08:00"
updated_at: "2026-10-12T18:04:41+08:00"
source:
  - "https://planetscale.com/learn/courses/mysql-for-developers/examples/deferred-joins"
  - "https://www.percona.com/blog/mysql-order-by-limit-performance-optimization/"
---

**两份资料分别解释怎样降低偏移分页的取行成本，以及怎样让排序与结果定位减少查询工作。** PlanetScale 用同一分页查询比较延迟关联前后；Percona 讨论索引顺序、过滤成本和静态结果的位置预计算。以下保留与分页相关的论证，不将示例耗时作为通用性能承诺。

## PlanetScale：延迟关联

[原文](https://planetscale.com/learn/courses/mysql-for-developers/examples/deferred-joins)先查询 people 的完整记录，按 birthday、id 排序，跳过 450000 条后取 20 条。问题是数据库为最终丢弃的候选也可能付出完整行读取成本。

改写分两步：子查询只取当前页的 ID，外层再按 ID 关联 people。进一步给 birthday 建索引，让子查询使用覆盖访问，偏移扫描便只需读取较窄的索引条目，完整字段留到当前页确定后再取。

原文报告三种执行的耗时约为 600–700 毫秒、200 毫秒和 60 毫秒，分别对应原查询、延迟关联及加入索引后的版本。这是作者环境下的演示，说明缩小中间读取内容可能有收益，不代表所有查询都能获得相同比例的加速。

关键边界：内层仍有 OFFSET，仍需越过前面的候选；若原查询本就覆盖，收益会不同。MySQL 8.4 对含 LIMIT 的派生表如何处理，可结合[[mysql-manual-queries#分页与结果读取|官方派生表规则]]核对。不能把「晚取完整行」误记成「直接定位页码」。

## Percona：排序成本与结果位置

[原文](https://www.percona.com/blog/mysql-order-by-limit-performance-optimization/)强调，索引能提供 ORDER BY 顺序，不代表查询总成本低：若索引不能同时有效过滤，数据库可能检查很多记录才凑够一页。判断时应比较实际检查量与返回量，而不是只看有没有排序索引。

大 OFFSET 即使沿索引顺序读取，仍然昂贵。文章给出两个方向：限制过深页码；对静态结果预计算位置，再用带索引的 position 范围查询替代大量偏移。后者把构建有序结果的工作提前，适合重复使用固定结果；数据、筛选和排序变化后的维护成本仍需由应用承担。

原文保留了不同时期的版本描述：前面关于混合升降序不能直接由索引支持的旧说法，与后文介绍 MySQL 8.0 降序索引的内容并存。用于 MySQL 8.4 时应按[[mysql-manual-queries#排序与分组的索引访问|当前排序规则]]理解，不能整篇照搬为当前版本结论。
