# 追加、覆盖与分别记录配图

- 生成方式：内置 imagegen；位图插画。
- 风格参考：`.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png`（仅风格）。
- 对应图片：`agent-task-state-conflict-choices.png`。

```text
Use case: infographic-diagram.
Asset type: 中文知识笔记里的辅助解释图，克制的二维技术编辑插画。
Primary request: 用三组具体记录的更新前后对照，让读者理解追加、覆盖、相近但不同而分别记录三者的区别；覆盖要留历史供恢复。所有内容属于“修复登录任务”的假设示例。生成一张完整、可直接插入笔记的高分辨率图片。

Reference image:
- /Users/lllllan/lllllan02/horizon/.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png：仅风格参考。参考具体对象造型、柔和细轮廓、留白、淡彩与中文层级。不复制参考图业务或布局。

Style: 白底，克制二维技术编辑插画，清晰规整中文无衬线字体，适度圆角、轻柔中细线。已有与处理后的记录用带折角的小文档，用户消息用小对话气泡，测试返回用报告票据；历史用一个小型归档托盘/档案页。对象必须可辨认，不把全部内容做成流程方框。无机器人、脑球、齿轮、3D平台、厚重阴影、渐变、花哨徽章、大色块背景、手写大标题、页尾口号。
Palette: white #ffffff, primary text #374151, secondary #64748b, light borders #a8b3c2. 现有且保留的文字用灰蓝；新增/替换字段用暖橙 #b66a43 与小面积 #fbf0e6；历史区用淡灰 #f8fafc，浅灰文字。每行的重点只落在更新后的具体字段。
Aspect: landscape around 4:3 or 1.45:1, enough vertical space for 3 clearly separate rows. Plenty of whitespace. No tiny footnotes.

Composition:
- Moderate top-left title “追加、覆盖，还是分别记录？”
- Small subtitle “修复登录任务 · 假设示例”
- Three aligned column headers across top: “已有记录” / “新信息” / “处理后记录”.
- Three independent horizontal comparison rows beneath headers. Rows are separate alternatives, NOT steps in one process. Do not draw arrows between rows.
- At far left of each row place a small short relationship label. Each row shows an old-record paper, a plus sign, a new-information object, a short right-pointing arrow with action label, and an updated-record paper. The plus means the model considers the existing record together with new information. Do not show the old record generating the new information.
- Do not add a model/program pipeline to every row: the previous figure already explains that. This figure focuses on content changes.

ROW 1 — relationship label “互补”:
Old record folded paper: header “待办”, one existing item “修复登录”.
New information speech bubble has source label “用户补充” and exact message “再补回归测试”.
Arrow label: “追加”.
Updated record paper: header “待办”, TWO separate items:
“修复登录” in unchanged gray-blue;
“补回归测试” in warm orange on a small pale-orange row.
The old item remains visible and unchanged; the new item is visibly added beneath it. No checkbox ticks implying completion.

ROW 2 — relationship label “矛盾”:
Old record paper: header “输出语言”, value “中文”.
New information speech bubble has source label “同一用户改口” and message “报告改用英文”.
Arrow label: “覆盖对应字段”.
Updated current record paper: header “输出语言”, a single active value “英文”, warm orange.
DIRECTLY BELOW this updated record, separated from the active record by a clear gap and a thin gray connector, a small archive tray or faded history paper labeled “历史（可恢复）” containing “旧值：中文”.
The active record contains ONLY 英文. 中文 is clearly stored separately in history and is NOT an additional simultaneously effective language. Keep the archive object small but readable, within this row, not bleeding into row 3. Do not strike through or delete the archive value.

ROW 3 — relationship label “相近但不同”:
Old test-state record paper: header “测试结果”, one row “登录测试：通过”.
New report ticket has source label “测试返回” and exact content “回归测试：失败”.
Arrow label: “分别记录”.
Updated record paper: header “测试结果”, TWO rows:
“登录测试：通过” in unchanged gray-blue;
“回归测试：失败” in warm orange on a small pale-orange row.
Emphasize that 登录测试 and 回归测试 are different named tests by keeping the full names visible. The old passing login test is NOT overwritten to failure by the other test's failure. This is content comparison, not an error warning; no red crosses or stop signs.

Text verbatim, no additional paragraphs:
追加、覆盖，还是分别记录？
修复登录任务 · 假设示例
已有记录
新信息
处理后记录
互补
待办
修复登录
用户补充
再补回归测试
追加
待办
修复登录
补回归测试
矛盾
输出语言
中文
同一用户改口
报告改用英文
覆盖对应字段
输出语言
英文
历史（可恢复）
旧值：中文
相近但不同
测试结果
登录测试：通过
测试返回
回归测试：失败
分别记录
测试结果
登录测试：通过
回归测试：失败

Semantic invariants:
1. 追加 = old item AND new item in active state.
2. 覆盖 = only new applicable value in active state; old value in separate recoverable history.
3. Similar words with different referents = distinct active records, not replacement.
4. Each row is a different scenario; no cross-row causal arrows.
5. User changes are explicit and from the same user, not arbitrary later text overriding earlier valid instructions.
Validation: Chinese accuracy, all text readable, old and new items aligned, action labels close to their arrows, history visually separate from active state, no confusing plus sign in row 2's final record, no giant summary/footer or unrequested panels.
```
