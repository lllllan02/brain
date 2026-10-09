---
title: "Cookie（浏览器状态数据）"
category: "HTTP"
created_at: "2026-10-09"
updated_at: "2026-10-09"
tags: ["HTTP", "Cookie", "会话"]
aliases: ["HTTP Cookie", "Cookies"]
---

**Cookie 是浏览器保存的一小段网站数据，浏览器会在符合发送条件的后续 HTTP 请求中携带它，让服务器能够关联多次请求。** 服务器通常通过响应头 `Set-Cookie` 设置 Cookie，浏览器随后通过请求头 `Cookie` 发送对应的名称和值；是否携带还受域名、路径、有效期及浏览器策略等条件约束。

例如，登录成功后，服务器可以让浏览器保存一个会话标识。浏览器再次请求该网站时带上这个标识，服务器据此查找登录会话。Cookie 是保存和传递数据的机制，会话是服务端或应用维护的交互状态，两者不是同一个概念；Cookie 也可用于保存偏好等非登录数据。

在 [[sso-session|SSO 登录流程]]中，认证中心与各应用可以分别使用自己的 Cookie，不需要跨所有系统共享同一份 Cookie。

依据：[HTTP 状态管理机制（RFC 6265）](https://www.rfc-editor.org/rfc/rfc6265.html)。
