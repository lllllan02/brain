---
title: "Redis 事务、Lua 与流水线"
category: "Redis"
updated_at: "2026-10-07"
tags: ["Redis", "事务", "Lua", "Pipeline"]
aliases: ["Redis transactions", "Redis pipeline", "Redis Lua"]
---

**流水线（pipeline）、事务（MULTI/EXEC）和 Lua 脚本解决的问题不同，别把「批量发送」当成原子事务**：

- **流水线（pipeline）**：批量发送、减少网络往返；但**不原子**，命令之间仍可能插入其他客户端的命令，批次过大还会增加缓冲和等待。
- **事务（MULTI/EXEC）**：命令排队、EXEC 时连续执行、不穿插其他命令；但**没有关系数据库式的通用回滚**（执行阶段某条失败不撤销先前成功的命令，入队错误与运行错误也要区分）。需要条件并发时用 WATCH：被监视 key 变化则事务中止，由客户端重读并重试。
- **Lua 脚本**：把读取、判断、写入放进一次服务器执行，适合「比较 owner 后删除锁」「库存足够才扣减」这类短小条件操作；代价是**执行期间阻塞其他命令**，且脚本出错同样不会自动回滚。
