---
title: "LlamaIndex：文档身份、刷新与删除"
category: "RAG"
tags: ["RAG"]
type: "article"
parent: "rag-index-lifecycle"
created_at: "2026-10-13T10:49:42+08:00"
updated_at: "2026-10-13T10:49:42+08:00"
source: ["https://developers.llamaindex.ai/python/framework/module_guides/indexing/document_management/"]
---

LlamaIndex 的 Document Management 用稳定文档 ID 关联文档、节点与索引操作。本文节选增量维护接口，依据 2026-10-13 滚动文档；未验证所有向量存储适配器。

## 怎样避免每次全量重建？

为加载的 Document 设置 `id_` 后，可按原身份更新。`refresh_ref_docs` 检查传入文档，更新内容发生变化的已有项并插入新项，返回各输入是否刷新的结果。它需要稳定身份；路径随意变化而 ID 跟着变化时，系统可能将更新误认为新增。

这不是“目录同步”的全部语义：对传入集合做刷新，不应被理解为自动识别所有消失的源文件。源端删除应显式转成删除操作。

## 删除了哪些对象？

`delete_ref_doc` 删除对应文档的索引节点；`delete_from_docstore` 默认 false，原因是多个索引可能共享 docstore。官方示例显式传 true，表示同时清理文档存储；这也意味着共享节点的影响需要调用者判断。

这些接口提供维护原语，不承诺外部缓存、其他索引和业务权限已经同步。应用仍需保存文档到衍生物的关系，并验证所用后端的实际删除行为。不要把“API 返回成功”直接等同于“所有旧答案已不可访问”。
