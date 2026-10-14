---
learning_status: understood
parent: context-compaction
title: "压缩摘要的存储与读取"
aliases: ["摘要覆盖范围", "压缩边界", "Summary Boundary"]
category: "Agent"
tags: ["上下文管理", "持久化"]
created_at: "2026-10-09"
updated_at: "2026-10-11T22:04:58+08:00"
reading_suggestions:
  - history-storage
  - pi-compaction-summary
  - langmem-summarization-summary
  - context-loading
  - agent-checkpoint-recovery
---

**压缩摘要与历史文件配合使用：历史保存原始消息，摘要记录哪些旧消息已被总结，读取时用摘要替代这部分输入。** 原文仍可回查，不必因压缩而删除。

## 存什么，存成什么样？

沿用[[history-storage|对话历史的存储]]中的 `session_01.jsonl`。假设 m1～m4 已被总结，后续消息继续追加到该文件；另用 `session_01.summary.json` 保存摘要：

```json
{
  "history_file": "session_01.jsonl",
  "covered_through": "m4",
  "summary": "正在排查超时；日志显示请求在 30 秒后超时，尚未修改代码。"
}
```

这是连续前缀压缩的简化示例，字段不是统一协议。`history_file` 定位历史文件，`covered_through` 表示**从历史开头到 m4 均已覆盖，包含 m4**；`summary` 是模型生成的摘要，可以是 Markdown 字符串。边界由程序记录，不靠解析摘要文字猜测。

[[langmem-summarization-summary|LangMem]]记录已总结的消息；[[pi-compaction-summary|Pi]]记录原文保留起点。两种标记方向不同，都用于确定摘要与原文的衔接位置。

## 怎样保存？

| 方式 | 与历史记录怎样配合 |
| --- | --- |
| 分开保存 | 历史文件继续追加消息，摘要文件保存正文和覆盖范围；上面的示例采用这种方式 |
| 同文件保存 | 在 JSONL 中追加摘要记录，用类型区分消息与摘要；读取时识别当前有效摘要 |
| 数据库保存 | 摘要与消息关联到同一会话，用消息 ID 或顺序定位覆盖范围 |

再次压缩时，用新摘要和新边界一起替换有效摘要记录。生成或写入失败时，继续使用旧记录；分文件可先写临时文件再原子替换，数据库可用事务，并处理并发更新。

## 怎样读取？

以下示意摘要覆盖 m1～m4、历史已追加到 m7 时，两个文件怎样组成输入：

![[assets/context-compaction-storage.png|三行对齐展示历史文件、摘要文件与拼接结果：摘要替代 m1 到 m4，m5 到 m7 原样读取]]

**覆盖边界使用消息 ID，工具调用与结果用调用 ID 配对。** 保留消息直接取历史原文，不从摘要重新生成；切分不能拆散需要配对的工具交互。没有摘要时，按普通历史读取；引用的历史文件或边界找不到时，应检查记录一致性，不能当作历史已被覆盖。

摘要省略的细节仍可[[context-loading|按需回查]]。保存这些内容解决的是模型输入的重建，执行到哪个步骤则属于[[agent-checkpoint-recovery|中断恢复]]的问题。
