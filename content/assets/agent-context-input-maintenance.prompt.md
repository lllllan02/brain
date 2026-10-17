# Agent 上下文整合配图提示词

生成方式：内置 imagegen；交付为位图。

风格参考：`.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png`（仅风格）。

```text
Use case: infographic-diagram.
Asset type: 中文知识笔记《Agent 上下文》的辅助解释图。
Primary request: 将上下文组成与分层维护合成一张图：不同来源的指令、任务状态、工具定义、历史与资料先分别保留、更新、选择或缩减，再组成本轮上下文交给模型。只有选入本轮输入的内容才成为本轮上下文。用修复登录的假设任务说明内容的具体变化。

Reference image:
/Users/lllllan/lllllan02/horizon/.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png：仅风格参考。迁移克制二维技术编辑插画、文档折角、目录页签、局部淡彩、清楚轮廓与文字层级。不要复制参考图的工具注册表内容、布局或执行入口。

Style: 白底、留白、规整易读中文，深灰或灰蓝中细轮廓。指令用折角文件，任务状态用带页签笔记，工具目录用文件夹和小标签，历史资料用叠放消息和文件；不要把所有对象画成同样的卡片。低饱和浅蓝为当前有效和选中内容，暖橙仅突出更新进度及读入的文件片段。无机器人、发光脑球、3D、厚重阴影、渐变、粗黑描边、页尾总结、宣传口号。
Palette: #ffffff background; #374151 main text; #64748b secondary; #a8b3c2 light border; #416788 selected/current paths; #eaf0f7 small blue fill; #b66a43 updates and extracted file excerpt; #fbf0e6 small orange fill.
Aspect: landscape about 16:10; four rows with enough vertical space, large legible text. Modest title “上下文：分别维护，按轮组装”; small subtitle “修复登录 · 假设示例”.

Composition:
Four aligned rows run left to right. Left column about 28% width has header “保存与维护的内容”. Center about 24% width has short action labels and arrows. Center-right about 33% width is ONE dashed boundary titled “本轮上下文”, containing four distinct input objects vertically aligned with source rows. At far right (~10%) a small neutral model node says “模型”; a single arrow from the context boundary to the model says “传入本轮”. There is no separate duplicated output-input panel. Keep all arrows simple and horizontal; evidence arrow may point down to state-update arrow. Don't cross text.

Row 1:
Left folded document titled “指令”, text “只改 auth.py”. Arrow labeled “保留有效约束” leads to first input object inside the boundary, titled “有效指令”, text “只改 auth.py”.

Row 2:
Left tabbed notebook titled “任务状态”, text “进度：待验证”. A tiny orange evidence ticket above the connecting arrow says “登录测试：未通过”; it points down to action “更新状态”. Right object titled “最新任务状态”, text “进度：测试未通过”. Highlight only the changed progress in pale orange. Do not mark task complete or imply root cause is already known.

Row 3:
Left tool directory titled “工具目录”, with three tabs “读取”, “测试”, “邮件”; first two blue, email gray. Arrow labeled “选择本轮工具” leads to input folder titled “工具定义”, with only “读取、测试” and a short second line “名称 · 用途 · 参数”. Email stays outside the context boundary. These represent definitions, not executable function objects sent to the model.

Row 4:
Left overlapping sheets titled “历史与资料”. Distinguish rear sheets “旧日志”, front message “近期结果”, and a small file “项目文件” with one orange highlighted short segment. Below these as a compact incoming message tab write “当前请求：修复登录”. The connecting arrow action label is two short lines “旧段摘要，近期保留” and “文件按需读取”. Right input message stack titled “选定消息与资料”, containing three short lines “当前请求 + 近期结果”, “旧段摘要”, “读入的文件片段”. Give only file excerpt a small pale orange accent. The whole project file and full old logs remain outside the input boundary. No external file directly connects to the model. Current request must not be represented as part of the old-log summary.

All objects inside the dashed boundary collectively form the current context, NOT rank levels or message/API role hierarchy. The diagram is a conceptual engineering illustration; do not add protocol serialization. Distinct object outlines + actual before/after content should explain composition and management together. No footer legend or explanatory paragraph.

Text, verbatim:
上下文：分别维护，按轮组装
修复登录 · 假设示例
保存与维护的内容
本轮上下文
指令
只改 auth.py
保留有效约束
有效指令
只改 auth.py
任务状态
进度：待验证
登录测试：未通过
更新状态
最新任务状态
进度：测试未通过
工具目录
读取
测试
邮件
选择本轮工具
工具定义
读取、测试
名称 · 用途 · 参数
历史与资料
旧日志
近期结果
项目文件
当前请求：修复登录
旧段摘要，近期保留
文件按需读取
选定消息与资料
当前请求 + 近期结果
旧段摘要
读入的文件片段
传入本轮
模型

Semantic invariants: Only input objects inside boundary reach the model. Effective constraint remains unchanged; progress is replaced after test failure; only needed tool definitions are selected; old logs become summary; relevant recent evidence and current request remain; only a file excerpt is read into context, not all files or all persisted material. Model node is neutral, not a robot or glowing brain. Four categories are uses, not fixed number of protocol layers or instruction priority.
Validation priorities: Chinese exact and legible, no overlaps or clipped text, correct arrow destinations and directions, source-to-input differences visible, all four objects contained in one context boundary, model receives only the assembled context. Match reference style in object shape, whitespace, restrained line and title weights, and small color areas.
```
