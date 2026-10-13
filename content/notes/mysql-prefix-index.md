---
learning_status: understood
title: "前缀索引（Prefix Index）"
category: "MySQL"
parent: mysql-indexes
tags: ["MySQL", "索引", "前缀索引"]
created_at: "2026-10-12T15:29:11+08:00"
updated_at: "2026-10-12T17:29:15+08:00"
---

**前缀索引（Prefix Index）是只将字符串列的前 N 个字符或字节作为索引键的索引。** 以下讨论 MySQL 8.4、InnoDB 的 B+ 树二级索引。

长字符串完整放入索引，会使条目变宽、占用更多页和缓存。若开头一段已能排除大部分候选，就可以只索引这一段，以较小的索引换取初步筛选能力；表中的完整值仍然保留。

## 截短后，怎样找到完整值

假设 users 的主键是 id，email 为 VARCHAR，建立前两字符的索引：

```sql
CREATE INDEX idx_email_prefix ON users (email(2));
SELECT id FROM users WHERE email = 'li@example.com';
```

下面是假设数据；二级索引还保留主键，用于找到对应行：

| id | 表中的 email | 索引中的前缀 |
| --- | --- | --- |
| 1 | li@example.com | li |
| 2 | lin@example.com | li |
| 3 | wu@example.com | wu |

完整 email 索引能区分前两行；前缀索引只能确定它们都以 `li` 开头。采用前缀索引时，查询过程是：**定位 `li` → 得到 id 1、2 → 回表检查完整 email → 留下 id 1。** id 3 可以直接排除。

这里即使只返回索引中已有的 id，也仍需回表：缺少的是「判断 WHERE 所需的完整 email」。因此它不能为这条查询提供[[mysql-covering-index|覆盖访问]]。截短减少了存储，也丢掉了区分候选所需的信息，这是额外检查的原因。

## 前缀取多长

前缀越短，通常越省空间，但相同前缀下的候选可能越多。可以先比较不同长度保留了多少不同值：

```sql
SELECT COUNT(DISTINCT email) AS full_values,
       COUNT(DISTINCT LEFT(email, 2)) AS prefix_2,
       COUNT(DISTINCT LEFT(email, 8)) AS prefix_8
FROM users;
```

前缀的不同值数量越接近完整值，整体区分能力通常保留得越多；但还要检查常查前缀是否聚集了大量记录，并按[[mysql-index-access-cost|实际查询成本]]验证。2 和 8 仅用于演示，没有通用的最佳长度。

按[[mysql-manual-queries#前缀索引与维护成本|官方规则]]，还需保留三个边界：

- VARCHAR 等非二进制字符串按字符指定 N，二进制字符串按字节；索引长度上限另按字节计算。
- 前缀未保存后缀，无法单独提供完整列值或完成完整列的排序；若加 UNIQUE，约束的是前缀唯一，会拒绝前缀相同而完整值不同的记录。
- 这里截取的是「一列中的值」；[[mysql-composite-index|联合索引的最左前缀]]讨论的是「从左开始的连续索引列」。
