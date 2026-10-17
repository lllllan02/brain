---
title: "Mem0：追加提取、显式更新与检索"
parent: agent-memory
category: "Agent"
tags: ["Agent", "记忆", "检索"]
created_at: "2026-10-12T23:24:47+08:00"
updated_at: "2026-10-13T12:48:15+08:00"
source:
  - "https://docs.mem0.ai/open-source/overview"
  - "https://docs.mem0.ai/core-concepts/memory-operations/add"
  - "https://docs.mem0.ai/core-concepts/memory-operations/update"
  - "https://docs.mem0.ai/core-concepts/memory-operations/search"
  - "https://github.com/mem0ai/mem0/blob/b7ad69afda6b6ed030347c66d48a13e4de9dec08/mem0/memory/main.py"
reading_suggestions:
  - mem0-paper-memory
---

**「Mem0 封装从消息提取、保存到检索的记忆服务；当前文档将 `add` 定义为追加式写入，纠正已有条目使用 `update`。」** 文档核对于 2026-10-12，Python 源码固定于 `b7ad69afda6b6ed030347c66d48a13e4de9dec08`；未调用模型或部署服务。

## 一次 add 做了什么？

[Add Memory](https://docs.mem0.ai/core-concepts/memory-operations/add) 区分 `infer=True` 的信息提取和 `infer=False` 的直接保存。前者由 LLM 提炼事实、偏好，后者跳过提取；混用两条路径可能产生重复。托管 API 可以先返回 PENDING 与 event ID，应用需要确认后台处理完成，不能把请求已接收当作记忆可读。

固定提交的 Python [`_add_to_vector_store`](https://github.com/mem0ai/mem0/blob/b7ad69afda6b6ed030347c66d48a13e4de9dec08/mem0/memory/main.py#L881) 展示 V3 分阶段路径：

「取最近消息 → 在 scope 内查相关旧记忆 → LLM 提取新条目 → 批量生成 embedding → 文本哈希去重 → 写入向量存储并记录历史」。

旧记忆进入提取提示，帮助判断已有信息；后面的**「哈希检查只能识别相同文本」**，也只覆盖当前取得的候选与批次。不能将这两步理解为完整的语义去重或冲突解决。该路径允许无可记内容，模型调用失败则抛出异常，二者语义不同。

## 偏好改变时怎么办？

当前 [Update 文档](https://docs.mem0.ai/core-concepts/memory-operations/update) 要求先定位 memory ID，再提交新的 text 或 metadata，并复查结果。假设“项目 A 用 Go”改成“项目 A 改用 Python”，应用要确认指的是同一项目和同一属性，再更新对应记录。单纯再调用一次 `add`，不能据文档保证旧事实被替换。

`expiration_date` 另管有效期：按当前 Add 文档，**「到期记录默认退出 `search` 与 `get_all`，但按 ID 获取仍可能返回」**。过期过滤不能当作物理删除。

这一区别影响升级判断：[[mem0-paper-memory|2025 年 Mem0 论文]]确实描述了提取后自动选择 ADD／UPDATE／DELETE／NOOP 的算法，但**「不能将它直接当作本篇固定提交的实现」**。2026-10-13 再次核对 Add 文档，仍为追加语义；使用其他版本时，应核对对应源文件。

## 读写接入还剩什么？

[Search](https://docs.mem0.ai/core-concepts/memory-operations/search) 通过查询和 filters 限定召回，可控制数量、阈值并配置重排。SDK 的参数随版本变化，例如当前文档要求 OSS 搜索把用户条件放在 `filters` 中。业务应从认证上下文确定这个条件，而不接受模型自由选择任意用户。

[OSS 概览](https://docs.mem0.ai/open-source/overview) 提供应用内库和自托管服务两种形态，模型、embedding、向量存储等组件可配置；Platform 另提供托管能力。接入它能减少提取与存储编排工作，但候选是否适用、何时更新以及最终注入多少内容，仍需应用策略和评测。
