---
title: "Oracle Database"
category: "数据存储"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["数据库", "Oracle"]
aliases: ["Oracle 数据库", "甲骨文数据库"]
---

**Oracle Database 是 Oracle（甲骨文）公司开发的商业[[relational-database|关系型数据库]]管理系统，面向企业数据存储与事务处理，提供查询优化、安全管理和高可用等能力。**

它的主要能力包括：

- 事务与并发：支持 ACID [[transaction|事务]]，通过撤销信息、重做日志、锁和多版本读一致性等机制管理数据修改与并发访问。
- 查询处理：提供 SQL、PL/SQL 编程、查询优化器和并行执行能力，支持复杂业务查询。
- 高可用与容灾：RAC 支持多个实例共同访问同一数据库，Data Guard 维护备用数据库，用于故障切换和灾难恢复。
- 安全与运维：提供权限控制、加密、审计，以及备份、恢复和监控工具。

具体能力取决于版本、产品版本类别和选件授权，不能把所有功能都视为默认可用。

参考：[Oracle Database 概念](https://docs.oracle.com/en/database/oracle/oracle-database/19/cncpt/introduction-to-oracle-database.html)、[高可用架构](https://www.oracle.com/database/maximum-availability-architecture/)。
