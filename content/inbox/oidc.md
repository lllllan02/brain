---
title: "OpenID Connect（身份认证协议）"
category: "身份认证"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["OIDC", "认证", "SSO"]
aliases: ["OIDC", "OpenID Connect"]
---

**OpenID Connect（OIDC）是在 [[oauth|OAuth 2.0]] 基础上增加身份认证能力的协议，让应用通过身份提供方（Identity Provider，IdP）确认用户是谁，是实现 [[sso|单点登录]]的常用标准。**

用户在身份提供方完成登录后，应用取得并验证 ID Token（身份令牌），据此确认登录用户。OIDC 规定 ID Token 使用 JWT 格式，包含用户标识及认证相关信息；用户资料还可以通过协议规定的其他接口获取。

两类令牌的用途不同：ID Token 面向登录应用，传达认证结果；[[oauth-token|Access Token]]用于访问受保护资源。OAuth 2.0 关注「允许访问什么」，OIDC 增加「登录用户是谁」的标准表达，二者不能因流程中都有登录页面而混为一谈。

依据：[OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)。
