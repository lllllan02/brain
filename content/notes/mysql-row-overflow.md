---
learning_status: understood
title: "溢出页"
category: "MySQL"
parent: mysql-clustered-index
tags: ["MySQL", "聚簇索引", "页"]
created_at: "2026-10-12T16:12:02+08:00"
updated_at: "2026-10-12T16:53:52+08:00"
reading_suggestions:
  - mysql-covering-index
  - mysql-manual-queries
---

**溢出页（Overflow Page）是存放行记录中页外字段内容的数据页。**

聚簇叶子空间有限，将长字段移到页外可以腾出空间存放更多行记录，代价是读取这些字段时还要访问其他页。

在 MySQL 8.4 的 InnoDB 中，是否外置取决于页大小、整行大小与行格式，不能仅凭声明为 TEXT 或 VARCHAR 判断。[[mysql-manual-queries#长字段与页外存储|官方行格式说明]]区分了两种布局：

- `DYNAMIC`：可将长字段值完整放到页外，聚簇记录保留 20 字节指针。
- `COMPACT`：相应页外字段在聚簇记录中保留 768 字节前缀和指针。

例如简介已放到页外，读取路径是「聚簇行记录 → 页外指针 → 简介内容」。这是继续读取字段；[[mysql-covering-index|回表]]则是从二级索引再查聚簇行记录，两者不同。
