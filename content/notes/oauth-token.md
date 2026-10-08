---
title: "OAuth 令牌"
category: "身份认证"
updated_at: "2026-10-08"
tags: ["OAuth", "令牌", "刷新令牌"]
aliases: ["OAuth 令牌", "Access Token", "Refresh Token"]
---

资源服务器验证**访问令牌（access token）**时，除了签名，还要核对**签发方、接收方、有效期和 scope**。令牌可以是自包含的 **JWT**，也可以是不透明（opaque）引用——后者通常要经服务端查询才能确定状态。**scope 只表达授权上限**，某条业务资源能否访问仍要另行校验。

**刷新令牌（refresh token）**要受保护地保存，并按客户端类型采用轮换或发送方约束（sender-constrained），同时考虑撤销与重复使用检测。

安全要求见 [OAuth 2.0 Security BCP（RFC 9700）](https://www.rfc-editor.org/rfc/rfc9700.html)。
