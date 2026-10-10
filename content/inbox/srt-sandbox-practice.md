---
parent: sandbox-implementations
title: "srt 本机沙箱的大致用法"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**SRT（Sandbox Runtime）根据配置，借助操作系统的隔离能力，带着访问限制启动本机程序。** 使用时不需要像 Docker 那样准备镜像、管理容器，而是把原来的 `python task.py` 交给 srt 启动。

流程是：**读取规则 → 建立受限环境 → 启动程序及其子进程**。Linux 通过 bubblewrap 组织命名空间、文件挂载等隔离；macOS 使用 Seatbelt 访问策略。网络由系统限制直连，再经代理检查允许的目标。实际限制由系统和代理执行，不只是检查命令文字。

这里主要限制「能访问什么」，**不会自动配齐 CPU、内存等资源额度**；需要时另接 systemd／cgroup。Namespace 可以先理解为分开程序所见的资源视图，cgroup 则主要限制一组进程的资源用量。Linux 细节留在[[sandbox-implementations#后续学习|后续学习问题]]中。

安装 `@anthropic-ai/sandbox-runtime` 及平台依赖，准备好配置和脚本后，在项目目录运行（示例未实测）：

```sh
# 原来直接运行：python task.py
# 现在把同一条命令交给 SRT：
srt --settings ./settings.json python task.py
```

`settings.json` 描述访问规则，`python task.py` 才是要执行的任务；Python 和依赖使用本机已安装的版本。配置主要关注：

| 内容 | 怎么配 |
| --- | --- |
| 文件 | `filesystem.allowWrite` 放任务目录，`denyRead` 排除私钥、云配置和 `.env`，`denyWrite` 保护不能修改的路径 |
| 网络 | `network.allowedDomains` 列允许站点，由运行时组织代理与直连限制 |
| 环境变量 | 在启动 srt 前使用环境白名单，例如 `env -i PATH="$PATH" HOME="$HOME" srt ...` |
| 资源与回收 | Linux 可在外层套 systemd／cgroup，执行器负责超时和子进程清理；macOS 不能照搬 Linux 配额参数 |

这里的读取限制是排除指定路径，**其他文件默认仍可能可读**。若要最小文件视图，应使用[[bubblewrap-sandbox-practice|明确挂载目录]]。清理环境必须在包装之前，避免连 srt 注入的代理变量一起删掉；Shell 启动脚本也不能重新带入秘密。

配置由可信执行器保管。需要 API key 时另接[[sandbox-credentials|认证代理]]，不要把网络代理自动理解为密钥代理。用允许访问成功、禁止访问失败做对照验证。参数为用法示意，未实测，采用时固定包版本。[官方安装与配置](https://github.com/anthropics/sandbox-runtime#usage)
