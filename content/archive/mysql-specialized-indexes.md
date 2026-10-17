---
learning_status: pending
title: "全文、空间与多值索引"
category: "MySQL"
parent: mysql-indexes
tags: ["索引", "全文检索", "JSON"]
created_at: "2026-10-12T17:42:58+08:00"
updated_at: "2026-10-12T17:42:58+08:00"
reading_suggestions:
  - mysql-manual-queries
---

普通 B+ 树按列值排列，适合等值与范围查找。但「包含某个词」「位于某片区域」「数组含有某个元素」需要不同的查找入口。MySQL 8.4、InnoDB 为这些需求提供以下索引；它们不是普通索引的通用替代品。

## 全文索引

**全文索引（Full-Text Index）是将文本拆为词项并建立词项与文档对应关系的索引。** 找包含某词的文章时，可先按词项取得候选，不必逐篇扫描完整文本。

假设 articles 的 body 为 TEXT：

```sql
CREATE FULLTEXT INDEX idx_body ON articles (body);
SELECT id FROM articles
WHERE MATCH(body) AGAINST('database' IN NATURAL LANGUAGE MODE);
```

FULLTEXT 适用于 CHAR、VARCHAR、TEXT。它按分词和检索规则匹配，不能直接等同于 `LIKE '%database%'` 的任意子串匹配；停用词、词长和分词器都会影响结果，中文等语言可评估 ngram 分词器。

## 空间索引

**空间索引（Spatial Index）是为几何对象的空间关系查询建立的索引，InnoDB 使用 R-tree 组织其包围矩形。** 查找某区域中的对象时，先按空间范围排除不相关对象，再按查询所需的精确几何关系判断；仅比较包围矩形不等于完成所有几何判定。

建索引的几何列需为 NOT NULL，供优化器使用时还需限制 SRID，明确采用的空间参考系统。例如 `location POINT NOT NULL SRID 4326` 配合 `SPATIAL INDEX(location)`。仅给经纬度两个数值列建普通联合索引，不会自动获得同样的空间检索能力。

## JSON 多值索引

**多值索引（Multi-Valued Index）是将一行 JSON 数组中的多个元素分别建立索引记录的二级索引。** 例如一行的标签编号为 `[3, 8]`，索引可分别从 3 和 8 找回同一行，解决「数组里包含某值」的定位问题。

```sql
-- 假设 tags 为存放整数数组的 JSON 列
CREATE INDEX idx_tags ON products ((CAST(tags AS UNSIGNED ARRAY)));
SELECT id FROM products WHERE 8 MEMBER OF(tags);
```

它支持适用条件下的 MEMBER OF、JSON_CONTAINS、JSON_OVERLAPS 查询，需要匹配 JSON 路径与元素类型。元素越多，维护的索引记录可能越多；不能把整个 JSON 文档都视为已覆盖。若只查询 JSON 中一个固定标量属性，应考虑提取该属性的表达式索引。

结构与使用限制见[[mysql-manual-queries#专用索引|官方导读]]。以上建表片段和 SQL 用于说明形态，未实测；实际采用需检查执行计划与数据语义。
