---
learning_status: pending
title: "RAG 数据准备"
category: "RAG"
tags: ["RAG", "知识库", "来源追溯"]
type: "overview"
parent: "rag"
created_at: "2026-10-13T10:54:36+08:00"
updated_at: "2026-10-13T10:54:36+08:00"
---

**数据准备把原始资料转换成可检索、可追溯、可更新的证据单元。** 索引是为了查找而生成的表示，原文与版本记录仍用于核对事实。

## 先保证解析结果没有改变含义

以产品手册为例，正文、配置表、脚注和版本说明可能共同决定答案。若解析把表格两列拼错，或去掉“仅企业版”这一标题，后面检索到的文本仍可能有害。

处理过程是「读取源文件 → 解析结构 → 去掉重复页眉等噪声 → 检查异常 → 保存规范化内容」。[[docling-document|Docling 的文档模型]]展示了保留表格、章节与位置的方式。扫描件需要 OCR；图表含义无法由纯文本保留时，交给多模态路径，不能用空文本表示成功。

## 检索记录需要保存什么？

下面是自拟的片段记录，说明身份与正文的分工，不代表框架标准：

```json
{
  "chunk_id": "sso-guide:v3:section-2:0",
  "document_id": "sso-guide",
  "document_version": "v3",
  "section": "企业版 / 配置生效",
  "locator": {"page": 4},
  "text": "修改后，新登录会话使用新配置；已有会话不变。",
  "tenant_id": "demo",
  "acl_ref": "product-docs",
  "pipeline_version": "parser-a/splitter-b/embed-c"
}
```

document_id 稳定标识资料，version 区分事实快照，chunk_id 定位该版本中的片段。源地址、内容 hash 与处理状态可另存文档表；保存向量时，关联片段身份与 embedding 版本，避免只剩一组无来源数字。

## 从正确内容到合适的检索单位

[[rag-chunking|切分策略]]在“容易命中”与“信息完整”之间取舍。确定片段后，[[rag-embeddings|向量表示与索引]]解释怎样编码、怎样搜索以及为什么近似索引会漏候选。词项索引和向量索引可以同时由同一版本的片段生成。

解析、切分、embedding 任一配置改变，都可能改变下游记录。应记录处理版本，失败项可重跑，构建完成并核对数量与抽样内容后再对查询开放。后续增量变更由[[rag-index-lifecycle|索引生命周期]]维护。
