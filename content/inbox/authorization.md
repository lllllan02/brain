---
title: "授权（Authorization）"
category: "身份认证"
updated_at: "2026-10-08"
tags: ["授权", "权限", "Scope"]
aliases: ["Authorization", "鉴权", "权限控制"]
---

**授权是决定「已认证的主体能做什么」的过程**：针对某个资源和操作，判断这个身份是否被允许。它通常以[[authentication|认证]]为前提。

实现上有 ACL、RBAC、ABAC 和策略引擎等。OAuth 里的 **scope 只是授权上限**，落到具体业务资源仍要另行校验（见[[oauth|OAuth 授权]]）；网关上的「鉴权」也属于这一层，见 [[api-gateway|API 网关]]。
