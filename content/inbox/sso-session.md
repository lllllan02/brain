---
title: "SSO 如何建立各应用的登录会话"
category: "身份认证"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["SSO", "会话"]
---

**常见的跨域 [[sso|SSO]] 通过认证中心的会话复用认证结果，再由各业务应用建立自己的本地会话。** 用户不需要重复输入凭证，但各应用不必共用同一份 [[cookie|Cookie]]。

访问应用 A 时，A 将用户重定向到认证中心。认证中心检查自己的会话，未登录才要求认证；A 收到返回的认证结果并校验后，建立本地会话。随后访问 B 时，B 也可通过认证中心确认身份，认证中心已有有效会话时通常无需再次输入凭证。

跨域系统常用 [[oidc|OpenID Connect（OIDC）]] 授权码流程，在 [[oauth|OAuth 授权]]之上取得可验证的身份信息。应用需要验证签发方、接收方、有效期和流程绑定，不能把任意 access token 当作登录凭证。

参考：[OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)。
