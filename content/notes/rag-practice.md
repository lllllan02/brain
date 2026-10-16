---
learning_status: pending
title: "RAG 实现与验证"
category: "RAG"
tags: ["RAG", "Go", "评测"]
type: "practice"
parent: "rag-engineering"
created_at: "2026-10-13T10:58:45+08:00"
updated_at: "2026-10-13T10:58:45+08:00"
---

**最小实现先跑通“有来源的材料 → 可复查的候选 → 带引用的回答”，再逐项加入优化。** 本篇给出可实施的组织方案与 Go 风格伪代码，未部署服务，也未做模型效果实验。

## 先准备能判断对错的输入

使用一小组产品说明，至少包含普通规则、例外、两个版本及一个用户无权访问的文档。每题人工标出必要事实和来源；再加入无答案问题。例子可沿用 SSO 生效规则，但测试内容应来自实际选定资料，不能拿模型生成答案当唯一标准。

入库输出[[rag-data|片段记录]]和文档版本表，先检查解析正文、检索结果与原文定位。实现起点可以只用已有全文检索；向量、融合和重排分别作为可替换组件加入。

## 服务怎样调用各组件？

下面的 `rag/service.go` 是建议文件位置，仓库中未创建该服务。依赖由启动程序注入；接口语义按文中的约定实现，不是某个现成 Go SDK：

```go
// Go 风格伪代码；省略类型声明和 HTTP 接入。
// ServeHTTP 完成身份认证后，调用 Service.Answer。
func (s *Service) Answer(ctx context.Context, user User, q string) (Answer, error) {
    scope, err := s.Auth.Scope(ctx, user) // 服务端计算身份范围
    if err != nil { return Answer{}, err }
    snapshot, err := s.Corpus.ActiveSnapshot(ctx, scope)
    if err != nil { return Answer{}, err }

    hits, err := s.Search.Query(ctx, q, scope, snapshot, s.CandidateLimit)
    if err != nil { return Answer{}, err } // 不伪装为无答案
    if len(hits) == 0 { return InsufficientEvidence(), nil }

    // 回查正文、版本和当前权限；已撤权条目不能交给模型。
    docs, err := s.Corpus.ResolveAuthorized(ctx, hits, scope, snapshot)
    if err != nil { return Answer{}, err }
    if s.Ranker != nil {
        docs, err = s.Ranker.Rank(ctx, q, docs)
        if err != nil { return Answer{}, err } // 基线不隐式降级
    }
    evidence, err := Pack(q, docs, s.InputBudget) // 按真实 token 计量
    if err != nil { return Answer{}, err }
    if len(evidence) == 0 { return InsufficientEvidence(), nil }

    out, err := s.Model.Generate(ctx, q, evidence)
    if err != nil { return Answer{}, err }
    for _, id := range out.CitationIDs {
        if !evidence.Contains(id) { return Answer{}, InvalidCitation(id) }
    }
    // 返回前复核撤权；语义支持度另行评测，ID 有效不等于事实正确。
    if err := s.Auth.CheckEvidence(ctx, user, evidence); err != nil {
        return Answer{}, err
    }
    return AttachSources(out, evidence), nil
}
```

Search 返回片段身份和检索分数，Corpus 从所绑定快照取正文并核对当前访问权；Pack 去除重复、保留来源与条件，在完整请求预算内选择证据。证据不足的语义判断由提示与后续校验处理，不能用“非空结果”替代。

## 想用现成框架怎样落地？

[[haystack-rag-pipelines|Haystack 官方教程]]给出组件注册、端口连接和运行入口：先构建 indexing pipeline，再以 query pipeline 连接 retriever、prompt builder 与模型。照所选版本教程安装环境并固定依赖，再把持久化存储、身份过滤和证据记录接到对应组件边界。它可以替代上面的手写编排；无须同时维护两套业务逻辑。

模型配置、索引地址与凭证由运行环境提供，离线入库和在线查询分开启动。先检查查询管线的中间文档输出，再接生成模型，能避免只看到最终错误答案却无从归因。

## 每加一个模块验证什么？

1. 基线：明确问题能命中原文，引用能打开，无答案不会编造。
2. 向量或混合检索：改写表达是否多找到必要证据，精确编号是否退化。
3. 重排与预算：固定候选，检查例外能否留下，记录新增耗时。
4. 更新与删除：源文改动后答案使用新版本，删除和撤权后缓存也不泄漏。
5. 服务化：超时、空结果与后端错误可区分，Trace 能回查实际注入证据。

通过以上检查只代表所选样本的行为满足要求。上线规模与实际质量仍需按[[rag-quality-evaluation|评测方法]]另行测量，不能由伪代码或教程推定。
