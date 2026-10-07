---
title: "镜像的 registry、repository、tag 和 digest 如何区分？"
category: "容器"
updated_at: "2026-10-07"
tags: ["Docker", "Registry", "镜像分发"]
---

Registry 是分发镜像的服务，repository 是其中一组镜像的命名空间，tag 是可变的名称，digest 是按内容计算的标识。发布时需要知道自己固定的是一个名字，还是具体镜像内容。

例如 `registry.example.com/team/api:v1` 中，前半部分确定仓库服务与 repository，`v1` 是 tag。仓库允许更新标签时，今天与下周拉取同一 tag 可能得到不同内容；`latest` 也只是名称，不表示经过验证的最新稳定版本。

按 digest 引用，如 `image@sha256:...`，可以固定所引用的内容。多平台镜像还可能先引用镜像索引，再按运行平台选择具体 manifest，所以要区分索引和单个平台镜像的 digest。[Docker 镜像拉取](https://docs.docker.com/reference/cli/docker/image/pull/)

推送和拉取会传输 manifest、配置与所需 [[container-images|镜像层]]，已有相同内容可以复用。Registry 的职责是分发与访问控制，不负责让运行中的容器自动切到新版本。

可追溯发布应记录实际 digest 与源码、构建记录的关系；回滚也应使用已确认的版本标识，避免重新拉取一个已经被覆盖的标签。
