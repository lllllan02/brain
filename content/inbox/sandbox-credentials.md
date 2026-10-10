---
parent: agent-sandbox
title: "沙箱中的工具如何使用凭据"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**凭据保护要解决：任务需要调用有认证的服务，但不应因此获得可随意复制的真实密钥。** 把 key 放进程序可读的环境变量或文件，它就可能进入日志、输出或外发请求。

| 任务情况 | 对应做法 |
| --- | --- |
| 不需要认证 | 不传凭据，清理输入文件和继承的环境变量 |
| 只需固定业务操作 | 由沙箱外的可信工具保存密钥，Agent 只提交参数、接收结果 |
| 要自己写脚本或运行 SDK | 接认证代理：程序使用占位值或不带认证，代理在沙箱外注入真实 key |
| 工具无法接代理 | 提供短期、限权、可撤销凭据；程序仍能读取，只是降低泄露后果 |

代理认证的过程是：**程序发请求 → 代理检查任务与目标 → 加入真实 key → 转发给 API**。代理地址和占位值可以公开给程序，密钥与修改代理规则的权限留在外面。普通网络转发不一定能处理 HTTPS 认证头，需使用支持该能力的代理。

隐藏密钥还不够：必须限制可调用的服务、操作与额度，避免程序借代理越权；目标响应和调试日志也不能回显秘密。SSH agent 等接口即使不交出私钥，也会授予认证能力。

[[e2b-sandbox-practice|E2B]]和[[docker-sandboxes-practice|Docker Sandboxes]]有集成用法，普通容器需要另外接代理；[[codex-credential-broker|Codex 源码]]展示占位值与目标绑定。用测试凭据验证正常调用与未授权请求。[Docker 凭据代理](https://docs.docker.com/ai/sandboxes/configuration/credentials/)、[E2B 注入](https://docs.e2b.dev/secrets/inject)
