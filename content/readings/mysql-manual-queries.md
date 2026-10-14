---
title: "MySQL 官方手册导读：查询与索引"
category: "MySQL"
parent: mysql-overview
type: "article"
tags: ["MySQL", "索引", "执行计划", "SQL优化"]
created_at: "2026-10-12T14:03:16+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://dev.mysql.com/blog-archive/mysql-explain-analyze/"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/optimizer-statistics.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/analyze-table.html"
  - "https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/select-optimization.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-performance-midpoint_insertion.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/connection-access.html"
  - "https://github.com/mysql/mysql-server/blob/8.4/sql/sql_parse.cc"
  - "https://github.com/mysql/mysql-server/blob/8.4/sql/sql_select.cc"
  - "https://dev.mysql.com/doc/refman/8.4/en/execution-plan-information.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-file-space.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-file-per-table-tablespaces.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool-flushing.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-checkpoints.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/derived-table-optimization.html"
  - "https://dev.mysql.com/doc/c-api/8.4/en/mysql-use-result.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/create-table.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/tutorial.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-introduction.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/explain.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/range-optimization.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/index-btree-hash.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/index-page-merge-threshold.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-row-format.html"
  - "https://github.com/mysql/mysql-server/blob/8.4/storage/innobase/btr/btr0btr.cc"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/column-indexes.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/table-scan-avoidance.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/explain-output.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/create-index.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/cost-model.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/type-conversion.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/descending-indexes.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/group-by-optimization.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/nested-loop-joins.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/hash-joins.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/invisible-indexes.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-limitations.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/index-merge-optimization.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/fulltext-search.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/innodb-fulltext-index.html"
  - "https://dev.mysql.com/doc/refman/8.4/en/spatial-index-optimization.html"
reading_suggestions:
  - mysql-index-ordering
  - mysql-manual-recovery
---

MySQL 8.4 手册把「写出查询」「理解数据组织」「观察执行计划」分在不同章节。本篇节选这条阅读路径，帮助理解索引为什么影响查询成本，不是整本手册摘要，也不提供面试题频率统计。

## 从 SQL 操作到 InnoDB

[Tutorial](https://dev.mysql.com/doc/refman/8.4/en/tutorial.html)通过创建和使用一个简单数据库，组织连接、建表、载入数据、筛选、排序、NULL、计数与多表查询；常见查询示例还包括分组最大值、外键和自增列。它适合定位 SQL 基础，复杂类型与优化规则需要转到专门章节。

[InnoDB 简介](https://dev.mysql.com/doc/refman/8.4/en/innodb-introduction.html)说明它是 8.4 默认存储引擎，提供事务、回滚、崩溃恢复、行级锁和一致性读。SQL 查询最终需要访问它管理的记录；[Buffer Pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html)按页缓存表和索引数据，常用页可直接从内存访问。因此，分析一次查询既要看访问哪些记录，也要考虑页面是否已在缓存中。

## SQL 从文本到执行计划

[连接认证](https://dev.mysql.com/doc/refman/8.4/en/connection-access.html)说明，新连接先校验身份与账号状态，接受连接后等待请求；连接成功并不取消后续语句权限检查。

[8.4 的 sql_parse.cc](https://github.com/mysql/mysql-server/blob/8.4/sql/sql_parse.cc)中，`dispatch_sql_command()` 解析文本并把语法结构交给后续执行。[sql_select.cc](https://github.com/mysql/mysql-server/blob/8.4/sql/sql_select.cc)中，普通未准备语句先进入 `prepare()`；`execute_inner()` 再调用查询表达式的 `optimize()` 与 `execute()`。这些位置支持「解析、准备、优化、执行」的职责划分，不代表所有语句、预处理语句和异常路径都严格复用同一条调用链。

[执行计划概述](https://dev.mysql.com/doc/refman/8.4/en/execution-plan-information.html)说明优化器结合表、列、索引和条件选择操作集合。Server 层据此组织访问，具体取行通过引擎完成；部分过滤可下推，分工边界应结合本篇 ICP 章节理解。

## 表空间怎样组织页面

[独立表空间](https://dev.mysql.com/doc/refman/8.4/en/innodb-file-per-table-tablespaces.html)把单张表的数据与索引放在一个 `.ibd` 文件中，默认启用；[文件空间管理](https://dev.mysql.com/doc/refman/8.4/en/innodb-file-space.html)还说明系统和通用表空间可共享容纳多表。因此「表」「表空间」「数据文件」不能无条件一一等同。

空间管理章节按页、区和段说明分配方式：默认页为 16 KB，此时 64 页组成一个区；索引叶子与非叶子分别使用段，段增长时可以先分配零散页，再分配整区。这些单位解决空间管理，行和索引条目怎样放入页仍需结合聚簇索引与行格式说明，不能仅按容器层级推导记录布局。

## 缓冲池与数据页写回

[Buffer Pool](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool.html)将访问过的表与索引数据按页留在内存，并使用分为新、旧部分的 LRU 变体管理缓存。新读页从旧区入口加入，后续是否提升需结合访问及[扫描抗性设置](https://dev.mysql.com/doc/refman/8.4/en/innodb-performance-midpoint_insertion.html)；其目的在于保留常用页，不能理解成所有扫描都会完全避免缓存污染。

[刷脏说明](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool-flushing.html)将脏页定义为已修改但未写回数据文件的页，由后台清理线程安排写回。脏页比例、可用页需求和 Redo 压力影响刷脏；为复用旧日志空间，需要先写回仍依赖那部分日志的修改。写回不足会积累压力，过多又占用业务所需的 I/O。

[检查点](https://dev.mysql.com/doc/refman/8.4/en/innodb-checkpoints.html)使用分批刷页的模糊检查点机制，避免一次写完全部缓冲池；恢复从检查点向后应用日志。结合 [[mysql-manual-recovery#Redo 怎样参与本机恢复|Redo 与恢复]]可知，数据页写回进度与事务提交状态是不同问题，不能据此推断页内所有修改均已提交。

## 索引怎样找到记录

[索引物理结构](https://dev.mysql.com/doc/refman/8.4/en/innodb-physical-structure.html)按树和页解释常规索引，记录位于叶子页。默认索引页大小为 16 KB，在实例初始化时确定。手册使用 B-tree 名称；[官方 8.4 源码的 Node pointers 注释](https://github.com/mysql/mysql-server/blob/8.4/storage/innobase/btr/btr0btr.cc)进一步说明：叶子页保存索引记录，非叶子层保存用于导航的键前缀与子页号。这是区分内部页和叶子页的实现依据。由页容量有限可以推导，导航条目越宽，一页能连接的子页通常越少；树高不能仅由行数确定。

[聚簇与二级索引](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html)进一步区分：**「聚簇索引保存行数据」**；定义主键时使用主键，否则选择首个所有列均声明 NOT NULL 的唯一索引；两者都没有时，以 6 字节递增行 ID 建立隐藏索引 `GEN_CLUST_INDEX`。二级索引记录包含索引列和主键值，需要其他行数据时，再按主键查聚簇索引。这解释了回表的额外访问，以及宽主键为什么增加二级索引空间。实际二级记录补存尚未包含的主键列，已在索引中的主键列不重复保存。

## 索引约束与列组合

[CREATE TABLE 的索引定义](https://dev.mysql.com/doc/refman/8.4/en/create-table.html)说明，主键唯一且非空，一张表只能有一个；主键也可以由多列组成。唯一索引允许可空列出现多个 NULL，普通索引不增加唯一约束。多列唯一索引约束组合值，所以单列值可重复。这些定义描述约束与列组合，应与聚簇、二级的存储组织分别理解。

## 长字段与页外存储

[行格式](https://dev.mysql.com/doc/refman/8.4/en/innodb-row-format.html)说明，长可变字段可能使用页外存储；保存行记录不等于所有列的全部字节都在一个叶子页中。`DYNAMIC` 可将长字段值完整存到页外，聚簇记录只留 20 字节指针；`COMPACT` 的相应页外字段保留 768 字节前缀和指针。是否外置取决于页大小和整行大小，不能仅凭字段类型判断。外置减少长字段对叶子页空间的占用，但读取这些字段还需访问溢出页。

## 联合索引的定位与排序

[联合索引](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html)用姓名索引说明列顺序的意义：索引按组合键排序，可以利用完整组合或最左前缀定位。将它类比为 `(user_id, created_at)`，可理解先固定用户、再找时间范围的访问方式；这是用于学习的类比例子，未运行测试。最左前缀描述定位能力，不能单凭缺少前导列就断言索引在任何执行方式下都毫无作用。

[范围优化](https://dev.mysql.com/doc/refman/8.4/en/range-optimization.html)进一步区分扫描区间与完整过滤条件：能够形成索引区间的条件用于定位，其余条件仍需检查。不能把某列未参与区间构造理解成该列在过滤或覆盖中也没有作用。

范围章节用「首列等值、第二列范围、第三列另有条件」说明：**「构造扫描区间不等于完成全部过滤」**。还介绍了有限条件下的 Skip Scan：枚举缺失前导列的不同值，再逐段做范围扫描；它不是任意查询都能使用的通用替代。

[ORDER BY 优化](https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html)说明，前导列固定为常量时，后续列的顺序可能直接用于排序；能否省去额外排序还取决于列顺序、方向和访问成本。这里可推导，联合索引列顺序应围绕查询整体设计，不能只按各列区分度排列。

## 索引条件下推与覆盖访问

[索引条件下推（ICP）](https://dev.mysql.com/doc/refman/8.4/en/index-condition-pushdown-optimization.html)在需要读取完整行时，把可仅凭索引列判断的部分条件交给存储引擎。引擎先读索引条目并判断，只有通过的候选才继续取完整行；InnoDB 的这种优化用于二级索引。它减少取行次数，与从索引直接取得全部所需列的覆盖访问有不同目的。手册用邮编定位、姓氏条件先过滤、地址条件取行后检查的例子说明这一路径。

手册将无 ICP 的路径明确写为「引擎读取索引条目并取得行 → Server 层判断条件」；采用 ICP 时，Server 层先把可在索引上判断的条件交给引擎，引擎只对通过者取行，再由 Server 层检查剩余条件。用于定位扫描范围的条件与这些剩余过滤条件应分开理解：索引有某列，不代表该列的过滤已在取行前执行。

ICP 的适用边界包括：需要读取完整行、使用受支持的访问方式；InnoDB 中用于二级索引，虚拟生成列上的二级索引不支持，涉及子查询或存储函数的条件也不能直接下推。不能把所有索引上过滤都称为 ICP。

[多版本与二级索引](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)补充覆盖访问的边界：二级记录带删除标记，或二级页被较新事务更新时，可能需要到聚簇记录核对事务可见性并读取历史版本。因此「列已覆盖」不保证运行时始终零聚簇访问。

[EXPLAIN 输出](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)区分 `Using index`（索引提供所需列）和 `Using index condition`（**「先检查索引条目，再决定是否取行」**）。这些标记说明访问方式，不是耗时结论。

## 前缀索引与维护成本

[列索引](https://dev.mysql.com/doc/refman/8.4/en/column-indexes.html)说明，字符串索引可只保存开头一段，以减少索引体积；搜索值超过这段长度时，索引先排除不匹配候选，再检查完整值。非二进制字符串的前缀长度按字符指定，二进制字符串按字节指定，存储上限仍按字节计算。

结合 ORDER BY 章节可知，前缀相同的不同完整字符串无法靠该索引区分后续顺序，因此它不能独自完成完整列排序；同理，未保存的后缀也不能从前缀条目还原。不要把「字符串截取前缀」与「联合索引从左起若干列」混为一谈。

[CREATE INDEX 的唯一索引规则](https://dev.mysql.com/doc/refman/8.4/en/create-index.html)明确，指定前缀的 UNIQUE 索引要求前缀范围内唯一。因此，两个非空完整值即使不同，只要前缀相同也会发生唯一约束冲突，不能把它等同于完整值的唯一索引。

[索引优化概述](https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html)强调，多余索引占空间，且增加增删改的维护成本。结合联合索引、覆盖访问与排序规则，设计需要比较减少的扫描和取行工作，是否抵得上额外空间及写入成本；不存在所有业务通用的列顺序或索引数量。

## 树索引与哈希的适用范围

[官方比较](https://dev.mysql.com/doc/refman/8.4/en/index-btree-hash.html)说明，树索引支持等值与范围定位，哈希索引只适用于相应的等值比较，不能借助键顺序加速排序。该比较尤其针对可以选择这两类索引的 MEMORY 引擎，不意味着 InnoDB 的常规索引可以直接切换为 HASH。

## 页分裂与合并

[官方源码注释](https://github.com/mysql/mysql-server/blob/8.4/storage/innobase/btr/btr0btr.cc)说明叶子分裂涉及选择分裂点、分配新页、补充上层导航项和搬移记录；文件页分配注释只说尽量让叶子页在磁盘上连续，并不保证物理连续。分裂是维护有序结构的写入成本，不能理解成每次插入都会发生。

[合并阈值](https://dev.mysql.com/doc/refman/8.4/en/index-page-merge-threshold.html)说明，删除或记录缩短使页填充低于阈值时，InnoDB 尝试与相邻页合并，默认阈值为 50%。这是尝试条件，不能写成低于一半必然立即合并；合并后很快又分裂也可能增加开销。索引物理结构章节说明插入顺序影响页填充，顺序插入与随机插入不能假定有相同空间利用率。

## 怎样知道优化器实际选了什么

[优化器成本模型](https://dev.mysql.com/doc/refman/8.4/en/cost-model.html)按操作代价估算计划成本，包括读取内存或磁盘中的页、计算行条件和比较键等。成本常量与预计工作量服务于计划比较，不是对真实耗时的承诺；由此可理解，统计估算偏差与运行环境差异都可能影响选择效果。

[全表扫描的选择](https://dev.mysql.com/doc/refman/8.4/en/table-scan-avoidance.html)列举了小表、匹配范围太大、键区分度低等情况：经索引反复取行可能比扫描整表更贵。手册也建议在统计分布不准确时更新统计信息，说明优化器依赖估算，选择并非永远正确。不能用固定命中百分比替代实际成本判断。

[EXPLAIN](https://dev.mysql.com/doc/refman/8.4/en/explain.html)提供优化器的执行计划，支持表格、JSON 和 TREE 等表示。它帮助检查表访问顺序和索引选择；有候选索引不代表优化器一定采用，统计信息也会影响选择。

**「普通 EXPLAIN 展示计划与估算」**；`EXPLAIN ANALYZE` **「会实际运行受支持的语句」**，再给出实际行数、循环次数和耗时，便于比较预期与现实。阅读重点是「访问多少数据、重复执行多少次、时间花在哪里」，不能只根据某个标记给整条 SQL 判定快慢。使用 ANALYZE 时要意识到它会执行语句；本导读没有运行 SQL，也不把文档示例当作本地性能结论。

[优化器统计](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/optimizer-statistics.html)说明列直方图怎样用值分布估算过滤比例。直方图主要有助于非索引列，适用时优化器优先采用范围优化器估算；有直方图也不保证选择更快的计划。

更新规则须同时核对 [ANALYZE TABLE](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/analyze-table.html)：索引统计与列直方图是不同对象，后者用 UPDATE HISTOGRAM 等子句创建和管理，默认手动更新；8.4 支持显式启用 AUTO UPDATE，此时执行 ANALYZE TABLE 或后台重算持久统计时也会更新直方图。统计概述中「只按需更新」的概括不能覆盖这一可选行为。

## EXPLAIN 的字段与常见标记

[8.4 EXPLAIN 输出说明](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)将表格信息分为 12 个字段。`id`、`select_type` 识别 SELECT 查询块，`table`、`partitions` 指明表或中间结果与分区范围；同一查询块访问多表可以显示多行，UNION 结果行的 id 可为 NULL。派生表和物化子查询在 table 中可呈现为 `<derivedN>`、`<subqueryN>`，数字关联查询块。

索引信息需分工阅读：`possible_keys` 是查找候选，`key` 是实际选择，覆盖扫描所用的 key 可能不在候选中；`key_len` 是所用键长度，可结合列定义判断联合键部分，可空列会增加一个字节；`ref` 指明与键比较的常量、列或表达式。`rows` 估算检查量，`filtered` 估算保留比例，二者相乘还需除以 100，才是预计传给后续操作的行数。

手册用唯一性与匹配方式区分访问类型：`const` 用主键或唯一索引全部键部分匹配常量，至多一行；`eq_ref` 对前表的每个行组合用完整主键或非空唯一键定位一行；`ref` 查找同键值的全部匹配；`range` 访问区间；`index` 与 `ALL` 分别扫描整个索引与整表。访问类型本身不能替代总工作量比较。

查询块类型中，SIMPLE 不使用子查询或 UNION，PRIMARY 是外层 SELECT，SUBQUERY、DERIVED、MATERIALIZED 分别标识子查询、派生表与物化子查询。DEPENDENT SUBQUERY 依赖外层上下文，但不同外层参数组合与每个外层行的重新求值不是同一规则；UNCACHEABLE SUBQUERY 才明确要求为每个外层行重新求值，不能把两类混同。

Extra 补充剩余处理：`Using where` 表示条件限制输出，`Using index` 表示所需列由索引提供，`Using index condition` 表示先检查索引条件再取完整行；`Using filesort` 表示额外排序，`Using temporary` 表示需要临时表保存结果。[内部临时表说明](https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html)区分内存与磁盘存储，还指出派生或物化临时表不一定显示 Using temporary。因此，不能仅凭标记判断是否落盘，也不能凭标记缺失排除所有临时表。

判断回表代价需结合索引覆盖情况与取行路径，不能将某一列直接当成回表次数；实测则结合 ANALYZE 的实际行数、循环和时间，区分扫描量与最终返回量。

## EXPLAIN ANALYZE 的行数与时间

[8.4 EXPLAIN 说明](https://dev.mysql.com/doc/refman/8.4/en/explain.html)规定 ANALYZE 实际执行受支持的语句，以 TREE 输出操作节点；时间单位为毫秒，**「节点时间包含子节点、不包含父节点」**，多轮执行显示平均时间。它有执行与测量开销，不能视为只生成计划的命令。

Norvald H. Ryeng 的 [MySQL EXPLAIN ANALYZE](https://dev.mysql.com/blog-archive/mysql-explain-analyze/)以 8.0.18 的 Sakila 数据库查询解释读法：两名员工分别关联付款记录，因此内层过滤执行两轮。过滤节点预计每轮输出 894 行，实际约 2844 行；索引查找的预计与实际行数却较接近，显示误差主要出现在日期过滤的选择率估计。

该过滤节点平均完成一轮约 22.767 毫秒，包含下方索引查找的约 19.988 毫秒。由此作者判断主要时间花在取数，过滤本身相对便宜；两轮过滤对应的总工作还需考虑 loops，父节点已包含这部分时间，不能再次相加。这里保留原文实测用于解释字段，不代表 MySQL 8.4 或当前设备的性能结果。

## 查询优化的检查范围

[SELECT 优化](https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/select-optimization.html)将主要检查点组织为索引、重复函数计算、大表扫描、统计信息及执行计划。函数若对每个候选调用，单次开销会被候选量放大；索引设计则应让一组相关查询受益，同时控制空间与维护成本。手册还提醒避免把优化器已自动完成的转换写成复杂 SQL：是否改进应落实到最终计划和实际处理量。

## 查询条件与索引定位

[范围优化](https://dev.mysql.com/doc/refman/8.4/en/range-optimization.html)从条件提取键值区间，区间可比完整条件宽，扫描后仍需过滤。以常量开头且不以前置通配符开头的 LIKE 可参与范围构造；这不等于所有 LIKE 都能定位。

[类型转换](https://dev.mysql.com/doc/refman/8.4/en/type-conversion.html)说明，字符串列与数值比较时，多个不同字符串可能转成同一数字，不能按原字符串索引快速查找该值。转换影响的不仅是计划，也可能是比较结果，因此改写前要确认业务语义。

[函数索引](https://dev.mysql.com/doc/refman/8.4/en/create-index.html)保存表达式计算值，表达式需额外括号，且受生成列允许的函数与表达式限制。这是普通列索引不能直接定位计算结果时的一种方案，不是任意函数查询都能无条件提速。

## 排序与分组的索引访问

[ORDER BY](https://dev.mysql.com/doc/refman/8.4/en/order-by-optimization.html)用前导列固定为常量的例子说明后续列有序；混合升降序需匹配索引方向或其整体反向。[降序索引](https://dev.mysql.com/doc/refman/8.4/en/descending-indexes.html)允许按 DESC 存储键值。能提供顺序仍需比较取行成本；filesort 表示额外排序，可能在内存完成，不等同于写磁盘。

[GROUP BY](https://dev.mysql.com/doc/refman/8.4/en/group-by-optimization.html)区分松散与紧凑扫描：前者在适用条件下只取每组少量键，例如最左分组前缀后紧跟 MIN/MAX 的列；后者读取所选范围内的键，再利用连续分组。列序、常量条件、完整列索引及聚合函数共同限制优化，不能从“有分组列索引”推断扫描量必然很小。MySQL 8.4 不再为 GROUP BY 隐式保证排序。

## 分页与连接的工作量

[LIMIT](https://dev.mysql.com/doc/refman/8.4/en/limit-optimization.html)说明，有序索引可帮助尽早取得所需结果；若仍需 filesort，**「限制返回数量并不消除前面的候选读取」**。排序值相同时，未被 ORDER BY 区分的行可按不同顺序返回，因此稳定分页需要完整排序边界。把偏移改成上一页键值条件，是结合该规则与范围定位作出的应用推导，并非手册保证的固定耗时方案。

该节还用 `WHERE id2 > 3 ORDER BY id1 LIMIT 2` 比较两条候选路径：默认计划沿 id1 主键顺序扫描并检查过滤条件；关闭 prefer_ordering_index 后，示例转为利用包含 id2 的索引作范围访问，再执行 filesort。前者希望尽早找到足够结果，后者先缩小候选再排序。原文展示的是计划变化及估算，没有提供两者的实际耗时，不能据此推荐普遍关闭开关。对于[[mysql-index-ordering#少扫描还是省排序|过滤与排序的取舍]]，还要核对匹配数据在排序键上的分布：匹配很晚才出现时，少量 LIMIT 也可能扫描很多条目。

[嵌套循环](https://dev.mysql.com/doc/refman/8.4/en/nested-loop-joins.html)将外层每行传入内层继续查找，内层因而可能反复访问；适合的连接索引可减少每轮候选。与此同时，[哈希连接](https://dev.mysql.com/doc/refman/8.4/en/hash-joins.html)可在无合适连接索引等场景使用，不能把“无索引”一律写成嵌套循环重扫。应结合计划中的算法、行数与循环次数解释工作量。

## 分页与结果读取

[派生表优化](https://dev.mysql.com/doc/refman/8.4/en/derived-table-optimization.html)区分合并与物化；子查询含 LIMIT 时不能合并到外层查询块。由此可用子查询先确定一页 ID，再关联原表取列，但外层输出顺序仍应由外层 ORDER BY 保证。这支持延迟取行的改写，不表示子查询里的 OFFSET 扫描已经消失。

[mysql_use_result()](https://dev.mysql.com/doc/c-api/8.4/en/mysql-use-result.html)不先把整个结果集读入客户端缓存，而由 mysql_fetch_row() 逐行获取，客户端主要保留当前行与通信缓冲。结果未处理完前不能在同一连接执行其他查询，消费结束后需释放结果。这说明非缓冲读取降低的是客户端结果缓存开销，不能据此推断服务端扫描、排序或网络传输量也减少。

[一致性读](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)说明，REPEATABLE READ 下同一事务的一致性读复用首次一致性读建立的快照；READ COMMITTED 下每次一致性读使用新快照。不同请求或不同事务不会因携带相同游标就自动共享快照。[多版本机制](https://dev.mysql.com/doc/refman/8.4/en/innodb-multi-versioning.html)保留一致性读需要的旧版本，因此长时间保持读取事务也会影响历史版本的清理。

## 索引变更与可见性

[在线 DDL 操作表](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-operations.html)说明，**「新增普通二级索引支持 INPLACE」**、通常不重建表，并允许并发 DML，但不是 INSTANT。主键变更会重新组织行数据，全文与空间索引也有不同限制。[DDL 限制](https://dev.mysql.com/doc/refman/8.4/en/innodb-online-ddl-limitations.html)指出，结束阶段需要排他元数据锁，已有事务可能让操作等待；“在线”不等于无锁或无资源成本。

[不可见索引](https://dev.mysql.com/doc/refman/8.4/en/invisible-indexes.html)让优化器默认忽略某索引，同时**「保留其存储、维护与唯一约束」**。它适合评估不使用索引的查询影响，并可恢复可见；不能模拟真正删除后的全部写入收益，显式或隐式主键也不能被设为不可见。

## 扩展索引访问策略

[Index Merge](https://dev.mysql.com/doc/refman/8.4/en/index-merge-optimization.html)合并同表多个范围扫描，可执行并集、交集或其组合；它不合并多表扫描，也**「不等于建立联合索引」**。手册列出 OR 查询作为典型候选，具体算法有条件限制和合并成本。

[Skip Scan](https://dev.mysql.com/doc/refman/8.4/en/range-optimization.html)通过枚举缺失的前导键值，对后续列分别执行范围扫描。适用条件包括单表、只引用索引列、无 GROUP BY 或 DISTINCT、后续键范围条件等；EXPLAIN 的 `Using index for skip scan` 表示采用该策略。它保留联合索引原有列序，以多次定位绕过缺少前导条件的问题。

## 专用索引

[InnoDB 全文索引](https://dev.mysql.com/doc/refman/8.4/en/innodb-fulltext-index.html)保存词项与文档位置的对应关系；[全文查询](https://dev.mysql.com/doc/refman/8.4/en/fulltext-search.html)使用 MATCH AGAINST，受分词、停用词和词长等规则影响，提供 ngram 分词器支持中文等语言。它服务于词项检索，不应被当作任意子串匹配的等价替换。

[空间索引](https://dev.mysql.com/doc/refman/8.4/en/spatial-index-optimization.html)要求几何列非空；优化器使用时还要求明确 SRID，按空间参考系统进行包围矩形比较。结合 R-tree 结构可理解其筛选空间候选的作用，精确几何关系仍按所用空间函数判断。

[CREATE INDEX 的多值索引](https://dev.mysql.com/doc/refman/8.4/en/create-index.html)将 JSON 数组中多个元素映射到同一行，以 `CAST(... AS ... ARRAY)` 指定索引元素类型，支持适用条件下的 MEMBER OF、JSON_CONTAINS 和 JSON_OVERLAPS。它与提取单个 JSON 标量的表达式索引不同，数组越长也可能带来更多索引维护工作。
