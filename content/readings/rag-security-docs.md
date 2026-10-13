---
title: "Azure 与 OWASP：RAG 的权限和文档信任边界"
category: "RAG"
tags: ["RAG"]
type: "article"
parent: "rag-security"
created_at: "2026-10-13T10:49:42+08:00"
updated_at: "2026-10-13T10:49:42+08:00"
source: ["https://learn.microsoft.com/en-us/azure/search/search-security-trimming-for-azure-search", "https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html"]
---

Azure 的 security filter pattern 解释按身份裁剪搜索结果；OWASP 的 RAG Security Cheat Sheet 讨论资料投毒、提示注入、数据衍生物与缓存。本文节选与读取链路直接相关的部分，依据 2026-10-13 文档，未做攻击测试。

## 检索过滤是否等于身份认证？

Azure 示例在文档中存 principal 或 group ID，应用查询时带过滤表达式，只返回身份集合相交的文档。文档明确说这些 ID 只是过滤字符串，本身不做认证或授权。因此调用者身份和可使用的组 ID 必须来自可信服务端上下文。

每次查询都要应用过滤。把字段设为不返回，只影响响应形态，不能代替访问限制；这一点同样适用于片段回查和引用链接。

## 被允许读取的内容为什么仍不可信？

OWASP 区分“用户可以读”与“内容可以指挥系统”。检索文本可能夹带改变模型行为的指令，因此资料必须被当作证据数据，不能获得工具授权。来源追踪与内容摘要校验可帮助发现变化，但 hash 一致只能证明与基线一致，不证明文本没有注入。

文档删除或权限撤回还要传播到片段、向量、衍生索引和回答缓存。OWASP 同时指出 embedding 不是匿名化数据。工程上应按实际威胁和成本选择控制措施，不把整份清单理解为每个小型学习项目必须部署的配置。
