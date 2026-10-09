---
title: "OAuth 2.0（授权框架）"
category: "身份认证"
updated_at: "2026-10-09"
tags: ["OAuth", "授权"]
aliases: ["OAuth", "OAuth 2.0", "委托授权"]
---

**OAuth 2.0 是一种开放的授权框架，允许应用在获得授权后，访问其他服务中的有限资源，而不必取得用户的账号密码。** 它解决的是资源访问权限的授予与使用。

例如，用户允许某个第三方应用读取自己的 GitHub 仓库，应用取得[[oauth-token|访问令牌（Access Token）]]后，在授权范围内调用仓库 API。[[oauth-code|授权码流程]]是取得令牌的一种常见方式。

授权过程中可能先要求用户登录，以确定谁有权作出授权决定，但这不等于 OAuth 2.0 为应用定义了用户登录认证。Access Token 代表访问资源的授权，应用不能仅凭拿到它就认定用户身份；需要标准的身份认证能力时，可使用 [[oidc|OpenID Connect]]。

定义核对：[RFC 6749](https://www.rfc-editor.org/rfc/rfc6749.html)。
