---
title: "Google Cloud Storage：错误可重试与操作可重复"
parent: retry-decision
category: "分布式系统"
tags: ["重试", "异常分类"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
source: "[Retry strategy](https://docs.cloud.google.com/storage/docs/retry-strategy)"
---

**Cloud Storage 将重试判断拆成两部分：错误是否可能暂时恢复，以及重复执行是否会改变业务结果。**

## 错误值得重试，不等于操作安全

文档将 408、429、5xx，以及 Socket 超时、TCP 断开列为暂时故障候选。无效凭证、权限或代理配置有误，则需要先修复条件。

对候选错误，还要核对操作的幂等性：查询通常可以重复；创建新通知每次会产生新 ID，不能直接套用同样的重试策略。

## 幂等可以有条件

部分修改操作带上版本前置条件才适合自动重试。例如针对指定对象版本操作，避免重试时误改后来产生的新版本。文档把操作分成始终幂等、条件幂等和非幂等，并列出具体 API。[操作分类](https://docs.cloud.google.com/storage/docs/retry-strategy#idempotency_of_operations)

不同语言客户端的默认策略并不完全一致，因此不能只看到 SDK 有自动重试，就认为所有写操作均受保护。

可借鉴的判断是「错误是否值得再试 × 操作能否安全重复」，具体 API 和前置条件以 Cloud Storage 约定为准。按 2026-10-10 文档总结，未运行示例。
