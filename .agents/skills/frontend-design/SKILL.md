---
name: frontend-design
description: Design new interfaces or make substantial visual changes, including layout, typography, color, and interaction. Routine copy edits and behavior-only fixes usually do not need this skill.
license: Complete terms in LICENSE.txt
---

# Frontend Design

为当前读者与任务作出视觉选择。遵守项目 [AGENTS](../../../AGENTS.md)，先查看已有界面、组件与样式。视界是个人知识阅读工具，视觉效果应帮助查找与阅读；明确要求重新设计时可以改变现有方向。

## 确定改动尺度

局部调整沿用附近组件与设计变量，只改必要部分；新界面或显著改版才整体考虑布局、字体、配色和交互。根据已有要求解决常规选择，仅在关键歧义会改变结果时澄清，不为已授权的实现增加设计审批。

## 形成并实现方案

1. 明确用户在界面上要完成的动作与需要读到的信息，选择主次层级。标题、分组、边界和间距表达真实结构；编号用于有顺序的内容，不作为装饰。
2. 复用合适的设计变量，明确必要的新布局、色彩语义和字体层级。中文覆盖、字号、行宽、行高和对比度以实际阅读为准，不套英语字符数上限。字体数量与风格取决于内容，不强制新增字体或 hero。
3. 动效用来说明状态变化或引导必要注意力；非用户触发的动画保持克制。主题、圆角、渐变、卡片或特定配色都不是禁用项，也不是默认模板；选择要能说明其用途。
4. 实现时检查附近 CSS 的选择器和覆盖关系、布局约束、已有状态与事件流。避免为表现局部效果引入另一套组件约定。
5. 在实际页面查看改动，按用户任务检查信息层级、可读性和反馈；移除不服务内容的装饰。显著交互或布局变化按 [web-design-guidelines](../web-design-guidelines/SKILL.md) 审查受影响路径，不自动扩为全站审计。

## 界面文案

从使用者的动作命名，按钮直接说明结果，同一操作在按钮、反馈和错误中保持一致。空态说明如何开始，失败态说明问题与下一步。少用内部实现术语、宣传语、含糊标签和装饰性文字；语言与语气沿用项目及用户要求。

## 来源

改编自 [Anthropic frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design)，保留 [LICENSE.txt](LICENSE.txt)。本地将视觉方案与界面质量审查分开，未采用固定风格黑名单或强制创新要求。
