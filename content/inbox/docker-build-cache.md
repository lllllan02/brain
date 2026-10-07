---
title: "Dockerfile 怎样安排才能复用构建缓存？"
category: "容器"
created_at: "2026-01-17"
updated_at: "2026-10-07"
tags: ["Docker", "Dockerfile", "构建缓存"]
type: "practice"
---

构建缓存复用的是输入未变化的构建步骤。把稳定依赖放在前面、频繁变化的源码放在后面，可以避免每次改业务代码都重新安装全部依赖。

例如 Python 项目的以下片段仅演示步骤顺序，不是完整发布配置，也未执行构建：

```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

先只复制依赖清单，再安装依赖，最后复制源码。否则一个源码文件变化也可能使安装步骤失去缓存。`.dockerignore` 应排除无关输出与本地文件，减少构建上下文和非必要输入。

COPY、ADD 的缓存判断会考虑参与输入的文件内容和相关元数据；仅修改 mtime 不会单独使缓存失效。普通 RUN 的缓存也不会因为远程软件源变了就自动失效：相同的安装命令可能复用旧结果，需要主动安排更新。[缓存失效规则](https://docs.docker.com/build/cache/invalidation/)

某步失效会影响依赖它的后续步骤；多阶段构建中不相关的阶段不应简单理解为全部重做。分层减少重复工作，但不能代替依赖锁定、基础镜像版本管理与安全更新。

Dockerfile 描述如何得到 [[container-images|镜像]]，[[docker-compose|Compose]] 描述服务运行时如何组合。修改源码后是否重新构建，要由实际构建命令和挂载方式决定，不能只看到容器重启就认定镜像已更新。
