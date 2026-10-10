---
name: obsidian-markdown
description: 在本项目笔记中正确使用 Obsidian 双链、块引用、嵌入、提示块和 YAML 属性。新增或修改这些语法、排查格式问题时使用；普通答疑与不涉及特殊语法的文字修改不套用完整流程。
---

# Obsidian Markdown

本技能提供语法参考，不决定文章结构或强制使用展示组件。操作遵守项目根目录 [AGENTS.md](../../../AGENTS.md)；文件名、属性与链接以 [格式规则](../../../docs/metadata-and-links.md) 为准，正文以 [写作规则](../../../docs/writing-style.md) 为准。仅阅读当前任务相关且尚未读过或已变化的规则。

## 项目用法

- 沿用现有文档，只为当前表达需要选择语法；不要求每篇都有标签、别名、嵌入或提示块。
- 标题放在 title，正文不重复一级标题；属性按需使用，不从示例补齐字段。下方示例不是固定文章模板。
- 内部链接使用唯一英文文件名和适当显示名；整篇外部出处优先填 `source` 元数据，正文中的具体引用用 Markdown 链接。实际目标与锚点须经核对，不能照抄示例目标。
- Agent 移动或重命名文件时，按项目流程维护入站引用；不假设 Obsidian 自动更新了直接文件操作造成的变化。

## 双链与块引用

```markdown
[[note-name|显示名]]
[[note-name#章节标题|章节显示名]]
[[note-name#^block-id|段落显示名]]
[[#当前文档章节]]

可供引用的段落。 ^block-id
```

Obsidian 的列表或引用块 ID 可写在其后单独一行；网页是否能定位到相同位置需核对实际渲染。链接服务正文中的前置、展开、比较或实践关系，不额外堆放相关文档清单。

## 属性

仅需核对 YAML 类型或 Obsidian 内置属性时，阅读 [PROPERTIES.md](references/PROPERTIES.md)。标签名称选择和规范由 tag-taxonomy 技能处理，字段含义以项目格式规则为准。

以下是假设性格式示例，日期与标签需按实际内容确定：

```markdown
---
title: 索引如何减少扫描
aliases: [索引扫描]
category: MySQL
tags: [索引, SQL优化]
created_at: "2026-10-08"
updated_at: "2026-10-08"
---

索引通过有序结构缩小需要检查的数据范围；收益取决于过滤条件和实际命中量。

## 适用条件

结合查询条件和执行计划判断实际扫描范围。
```

## 按需使用的语法

- 嵌入：`![[note-name]]`、`![[assets/image.png]]`；详细语法见 [EMBEDS.md](references/EMBEDS.md)。笔记嵌入不用于复制或替代本篇必要解释。
- 提示块：以 `> [!note]` 开始，后续内容仍使用引用前缀；折叠和类型见 [CALLOUTS.md](references/CALLOUTS.md)。普通正文不强制套提示块。
- 高亮：`==文字==`；本项目正文强调优先遵循写作规则。
- 数学：行内 `$...$`，独立公式使用 `$$` 包裹。
- 图表：使用语言标识为 `mermaid` 的代码围栏。
- 脚注：引用 `[^1]` 与定义 `[^1]: 内容`；Obsidian 另支持内联脚注 `^[内容]`。
- 注释：Obsidian 用 `%%...%%` 隐藏阅读视图中的文本；这不是访问控制，也不保证网页隐藏它。
- 行内标签：Obsidian 支持 `#标签`，但本项目的标签元数据维护在 frontmatter 的 tags 中，不靠行内标签代替。

## 视界兼容与验收

Obsidian 语法支持不等于视界已实现相同效果。新增图表、嵌入、折叠等展示时，核对 [网页解析器](../../../apps/web/src/library.mjs) 和相关组件，并查看实际渲染。普通文字修改按项目规则读回即可。

当前展示能力以 [视界说明](../../../apps/web/README.md) 和实际代码为准，本技能不重复维护支持列表。尤其不要将 Obsidian 的全文嵌入、图片宽度、折叠、数学、脚注或隐藏注释直接视为网页已支持。

效果未验证时如实说明，优先采用能保持语义的普通 Markdown 表达；用户明确需要特殊效果时，可以按任务实现，不因本技能的旧记录否定需求。不能为一次笔记编辑自动扩大成网页功能开发。

## 来源

改编自 [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills/tree/main/skills/obsidian-markdown)。保留的参考文件介绍 Obsidian 语法，不构成本项目必填字段或网页功能承诺。

- [Obsidian Markdown](https://help.obsidian.md/obsidian-flavored-markdown)
- [内部链接](https://help.obsidian.md/links)
- [属性](https://help.obsidian.md/properties)
