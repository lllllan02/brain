---
title: "InnoDB 扫描抗性：图解与实验导读"
category: "MySQL"
parent: mysql-buffer-replacement
type: "article"
tags: ["MySQL", "缓存"]
created_at: "2026-10-12T19:51:35+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://xiaolincoding.com/mysql/buffer_pool/buffer_pool.html"
  - "https://www.percona.com/blog/mysql-5-6-vs-5-5-on-the-star-schema-benchmark/"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-performance-midpoint_insertion.html"
---

**「分区 LRU 先限制新加载页的优先级，时间窗口再阻止短期密集访问把它们立即提升。」** 本篇节选两篇文章中与扫描污染有关的解释和实验，参数语义按 MySQL 8.4 手册核对，不概括原文的全部 Buffer Pool 或基准测试内容。

## 从普通 LRU 到两层保护

小林 coding 的[《揭开 Buffer Pool 的面纱》](https://xiaolincoding.com/mysql/buffer_pool/buffer_pool.html#如何提高缓存命中率)先画页在普通 LRU 中的顺序变化，再引出两个失败场景：预读页可能从未使用；扫描页虽然被使用，之后却可能不再需要。前者说明加载不等于有用，后者说明访问不等于持续复用。

这使两项改进有了各自的理由：先将新加载页放入旧区，再为进入新区增加时间条件。读者可以跟着同一批页观察谁占据位置、谁被挤出，而不必先记参数。结果集很小也可能扫描很多页，是否造成污染应看实际访问范围。

原文将条件概括为在旧区停留超过一秒；它的详细步骤与[8.4 手册](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/innodb-performance-midpoint_insertion.html)明确了**「计时起点是首次访问」**。仅加载后等待不算满足提升条件，窗口结束后还须有访问。原文的「避免污染」应理解为降低风险，不能推成热点不会被淘汰。

## 实验提醒：抗扫描不等于所有负载都更快

Justin Swanhart 在 2013 年的 [Percona SSB 实验](https://www.percona.com/blog/mysql-5-6-vs-5-5-on-the-star-schema-benchmark/)比较 MySQL 5.5.30 与 5.6.10：单连接串行执行 13 条分析查询，分别使用小于数据集的 128 MB 缓冲池和可容纳数据集的 4 GB 缓冲池。

在 5.6.10、128 MB 缓冲池的一次重复运行中，默认配置总耗时约 324 秒，将 `innodb_old_blocks_time` 改为 0 后约 179 秒。作者由异常耗时继续检查缓存命中、页分布与提升计数，发现时间窗口会改变哪些页得以保留；扩大缓冲池后的表现也不同。

这是作者环境中的历史观察，不是本库实测，也**「不能直接外推到 8.4」**。文章自己指出因果和其他配置仍需继续调查。它的价值是展示优化的取舍：保护日常热点的规则，未必最适合连续分析扫描；参数应结合访问模式、容量及实际耗时验证，不能只追求减少提升次数。
