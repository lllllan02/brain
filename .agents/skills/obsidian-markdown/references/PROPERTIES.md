# Properties (Frontmatter) Reference

以下是 Obsidian 属性类型参考，不是项目字段清单。项目字段和日期语义以 [格式规则](../../../../docs/metadata-and-links.md) 为准；仅在有实际用途时添加属性。rating、completed、due 等类型示例不要求保存到笔记。

Properties use YAML frontmatter at the start of a note:

```yaml
---
title: 索引如何减少扫描
category: MySQL
tags: [索引, SQL优化]
aliases: [索引扫描]
---
```

## Property Types

| Type | Example |
|------|---------|
| Text | `title: My Title` |
| Number | `rating: 4.5` |
| Checkbox | `completed: true` |
| Date | `created_at: "2026-10-08"` |
| Date & Time | `due: 2024-01-15T14:30:00` |
| List | `tags: [one, two]` or YAML list |
| Links | `related: "[[note-name]]"` |

## Default Properties

- `tags` - Note tags (searchable, shown in graph view)
- `aliases` - Alternative names for the note (used in link suggestions)
- `cssclasses` - CSS classes applied to the note in reading/editing view

## Tags

```markdown
#tag
#nested/tag
#tag-with-dashes
#tag_with_underscores
```

Tags can contain: letters (any language), numbers (not first character), underscores `_`, hyphens `-`, forward slashes `/` (for nesting).

In frontmatter:

```yaml
---
tags:
  - tag1
  - nested/tag2
---
```
