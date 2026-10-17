# 同一份任务状态怎样更新

- 生成方式：内置 imagegen；重新设计旧图的位图插画。
- 旧图语义参考：`agent-task-state-conflict-choices.png`。
- 风格参考：`.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png`（仅风格）。
- 对应图片：`agent-task-state-merge.png`。

```text
Use case: infographic-diagram.
Asset type: 中文知识笔记中的完整工作场景解释图。
Primary request: 重新设计原图。用户不要三条独立案例行，不要表格、行列网格、三个隔离小流程。用同一个任务的两份完整状态文档，展示一批新信息如何同时改变同一份状态的不同字段，并把旧整份文档归档以便恢复。场景连续、内容统一。

References:
1. /Users/lllllan/lllllan02/horizon/content/assets/agent-task-state-conflict-choices.png is the OLD IMAGE / redesign target. Preserve its essential meanings: append supplementary information, replace an explicitly superseded value, keep different test results distinct, preserve history. Discard its whole row/column layout.
2. /Users/lllllan/lllllan02/horizon/.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png is STYLE ONLY.

Style: 克制二维技术编辑插画，白底，深灰蓝柔和细线，具体文档、纸条、档案夹造型，清晰易读中文无衬线。少量灰蓝 #416788/#eaf0f7 与暖橙 #b66a43/#fbf0e6，仅用小面积填充标明变化。留白充足；无3D、粗黑边、明显阴影、高光、机器人、脑球、齿轮、星芒、页尾口号、大色块背景。标题适中，不压过文档内容。Landscape around 1.7:1.

Unified composition:
- Title at top left “同一份任务状态怎样更新”.
- Small subtitle “修复登录任务 · 假设示例”.
- LEFT: ONE complete folded-corner state document titled “更新前 · v1”. Its body is a coherent record, with clear modest section labels and these exact fields:
  “目标：修复登录”
  “待办”
  “完善修复”
  “输出语言：中文”
  “测试结果”
  “登录测试：通过”
  All these contents belong inside the SAME document, not separate cards or rows across the canvas.
- RIGHT: ONE larger folded-corner state document titled “当前状态 · v2”. It contains the SAME goal, same grouping and order, with this exact content:
  “目标：修复登录” (unchanged, gray)
  “待办”
  “完善修复” (unchanged)
  “补回归测试” (new, pale orange highlight, small margin label “追加”)
  “输出语言：英文” (replaced, pale orange highlight, small margin label “替换”)
  “测试结果”
  “登录测试：通过” (unchanged)
  “回归测试：失败” (new, pale orange highlight, small margin label “不同测试，分别记录”).
  Make the tests' full names readable, with the two test rows visibly inside one section.
  The current language contains ONLY 英文, not Chinese crossed out or a bilingual active value.
- Above the space between these two documents, ONE slightly tilted input note titled “本轮新信息”. It contains 3 short lines:
  “用户：补上回归测试”
  “用户：报告改用英文”
  “工具：回归测试失败”
  This is ONE batch of incoming information for the SAME task, NOT independent hypothetical scenarios. Keep the note secondary to the main document comparison.
- At the center between the documents: a small flat comparison/pen symbol with the short label “核对含义后合并”. A horizontal arrow goes from the v1 whole document, through this comparison point, into the v2 whole document. The input note feeds this comparison point from above via a short arrow. This is not a separate oversized process box.
- Beneath the v1 document, a small archive folder with stacked whole-state pages, labeled “旧版归档” and “v1 · 含修改依据”. A short thin arrow from v1 document down to this archive labeled “更新前保存”. The archive represents the COMPLETE old document, not only the old language value. Both current state and old archive are clearly distinct.
- Along the lower whitespace, a thin lighter arrow leads from the archive toward the current-state document with a label “误改时，按差异恢复”. This is a secondary optional recovery path, not a second main process. Connect it to the lower edge of the current document without crossing any field contents. Keep route simple.
- A small secondary label by the current document “后续读取当前版”.
- No source/component columns, no table headers, no row separation lines. The entire scene is ONE update operation on ONE task record. Only two main full documents, one batch input note, and one small archive.
- Do not add another model/program pipeline: previous figure in the article explains those roles already.

Exact text:
同一份任务状态怎样更新
修复登录任务 · 假设示例
更新前 · v1
目标：修复登录
待办
完善修复
输出语言：中文
测试结果
登录测试：通过
本轮新信息
用户：补上回归测试
用户：报告改用英文
工具：回归测试失败
核对含义后合并
当前状态 · v2
目标：修复登录
待办
完善修复
补回归测试
追加
输出语言：英文
替换
测试结果
登录测试：通过
回归测试：失败
不同测试，分别记录
旧版归档
v1 · 含修改依据
更新前保存
误改时，按差异恢复
后续读取当前版

Semantic invariants: unchanged fields preserved; supplementary task added beside existing task; same user's explicit language change replaces only language; different test results both remain; v1 full snapshot archived prior to update; only v2 is the current effective record; recovery compares differences rather than indiscriminately resetting later correct updates.
Validation priorities: no independent scenario rows, same concrete full record before/after, readable Chinese, accurate field values and row grouping, coherent primary left-to-right direction, short clear archive/recovery paths. No extraneous annotations or summary panels.
```
