---
parent: sandbox-implementations
title: "Git Worktree 怎样与执行沙箱配合"
category: "Agent"
tags: ["Agent", "沙箱"]
created_at: "2026-10-10"
updated_at: "2026-10-10"
---

**Worktree 分开任务工作副本，文件、网络与凭据边界由外层执行沙箱提供。** 它适合避免多个 Agent 直接改同一份工作文件。

在已有 Git 仓库中创建独立工作副本，分支名与路径需尚未存在；示例未实测：

```sh
git worktree add -b sandbox-study ../sandbox-study HEAD
cd ../sandbox-study
# 配置需允许这个工作目录，且本机已有 Python 与项目依赖
srt --settings /absolute/path/settings.json python task.py
```

示例先建立工作副本，再由 SRT 运行脚本；`git worktree add` 本身不会运行或隔离程序。也可把这个工作副本作为[[docker-sandbox-practice|容器任务目录]]挂载，或作为[[srt-sandbox-practice|srt]] 的允许工作目录。若需要修改源码，将该任务目录设为可写，但不要再暴露其他工作副本或用户主目录。

Worktree 的 `.git` 通常是指向共同 Git 元数据的文件。只挂工作副本可能无法执行 Git；若再挂共享 Git 目录，就引入对其他分支、引用和仓库配置的影响面。只需编译测试时可不提供它；需要完整独立 Git 操作时可改用独立 clone。

结束后先审查、提交或导出任务改动，再执行 `git worktree remove ../sandbox-study`。它会在存在未提交修改时拒绝删除，不应自动加 `--force`。网络和环境变量不会因创建 Worktree 而改变，资源额度也仍由外层执行器设置。[Git Worktree 文档](https://git-scm.com/docs/git-worktree)。
