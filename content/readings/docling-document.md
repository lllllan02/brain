---
title: "Docling：保留结构与来源的文档解析"
category: "RAG"
tags: ["RAG"]
type: "article"
parent: "rag-data"
created_at: "2026-10-13T10:49:42+08:00"
updated_at: "2026-10-13T10:49:42+08:00"
source: ["https://docling-project.github.io/docling/concepts/docling_document/", "https://docling-project.github.io/docling/concepts/architecture/"]
---

Docling v2 的 DoclingDocument 是统一的结构化文档表示，可以保留文本、表格、图片、章节层次、正文与页眉页脚的区别，以及可用的版面位置和来源信息。本篇节选数据模型与转换架构，未测试具体 PDF 的识别质量。

## 为什么不只保留纯文本？

官方用 Word 样例对照结构化输出：文本项、表格项与分组通过引用组成文档层次。正文顺序与元素类型仍可区分，不必把所有对象压成一个字符串。来源信息可把提取内容联系到原始页或位置；是否具有坐标取决于输入格式与转换结果。

转换架构先由 backend 读取输入，再由 pipeline 执行解析与模型处理，最后形成统一文档。对 PDF 而言，文字顺序、布局、表格与 OCR 是需要处理的对象，不能把“文件读成功”当成“内容读正确”。

## 对 RAG 的意义与限制

从这种表示切分，可沿章节组织片段，并保留表头、图注与页码。纯文本导出便于搜索，却可能损失后续引用需要的位置，因此可同时保存结构化结果与检索文本。

后一条是基于数据模型的工程推导：Docling 提供可用结构，不保证所有复杂扫描件、公式或跨页表格都正确。接入前应拿真实文档逐项对照原页，而不是只看最终 Markdown 是否有文字。
