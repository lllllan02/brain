# brain

保存知识、想法、问题、计划和记录的个人大脑。内容以 Markdown 文件保存，Obsidian 与未来图谱看板共享同一份正文。

## 使用与启动

- Obsidian：打开本项目的 `content/`，从 [[maps/index|知识导航]] 开始阅读。
- Agent：在 brain 项目中工作，遵守 [[AGENTS|AGENTS.md]]。直接提出「把刚刚讨论的内容整理进知识库」，即可保存并维护链接。
- 图谱看板：`apps/web/` 尚未初始化，当前没有启动命令。后续二开现有项目，以文档节点、引用连线和重点预览作为阅读入口。

## 目录

```text
content/       个人内容：inbox 暂存、notes 正文、maps 导航
apps/web/      图谱看板代码
AGENTS.md      Agent 工作约束
docs/         管理规则的详细展开
```

notes 按入库月份分目录，如 `notes/202610/`，月内文件平铺；更新旧文留在原目录。主题与类型通过 `tags`、`type` 和地图表达，已有 `classes` 兼容保留。自己的文档直接保存，外部资料默认引用链接；原文与附件按实际需要保存。看板开发范围见 [[apps/web/README|看板说明]]。
