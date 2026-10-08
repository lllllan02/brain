---
title: "认证（Authentication）"
category: "身份认证"
updated_at: "2026-10-08"
tags: ["认证", "身份", "凭证"]
aliases: ["Authentication", "身份认证"]
---

**认证是确认「你是谁」的过程**：验证主体（用户、服务或设备）出示的凭证，得到一个可验证的身份。凭证可以是密码、令牌、证书，也可以再叠加多因素（MFA）。

认证成功只说明「这个身份属实」，不说明它能做什么——那是[[authorization|授权]]的事。常见的落地协议有 [[sso|单点登录（OIDC）]]，令牌本身见[[oauth-token|OAuth 令牌]]。
