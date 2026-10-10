---
parent: codex-sandbox-overview
title: "Codex 如何用凭据代理替代子进程中的真实密钥"
category: "Agent"
tags: ["Agent", "沙箱", "源码"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**凭据代理把子进程拿到的值与目标服务收到的值分开。** 工具使用占位值，可信代理在符合规则的请求中换入真实凭据。

[网络代理运行时](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/network-proxy/src/runtime.rs#L514)先从父环境发现配置支持的凭据，再虚拟化子环境。这样子进程可沿用认证变量名，而不必直接得到相应真实密钥。

[目标绑定测试](https://github.com/openai/codex/blob/5ef96ab2785f3ecddf279639eff7b1b42c906fa4/codex-rs/network-proxy/src/credential_broker_tests.rs#L1412)使用假密钥验证：面向默认 API 或配置的可信主机时，代理换入真实测试值；面向攻击者主机时，保留占位值。测试刻意区分「拥有变量」与「获准对该目标使用凭据」。

这依赖代理被启用、凭据被识别及目标配置正确，并不自动覆盖所有秘密。即使工具看不到密钥，它仍可能调用已授权接口，所以[[sandbox-credentials|凭据隔离]]还需结合接口权限和网络目标限制。

阅读范围：Codex `5ef96ab`，以下结论来自源码阅读，未在此运行沙箱。
