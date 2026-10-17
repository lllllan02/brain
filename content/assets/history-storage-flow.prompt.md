# 对话历史存储配图提示词

生成方式：内置 imagegen；交付为位图。

风格参考：`.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png`（仅风格，保留于项目中）。

```text
Use case: infographic-diagram.
Asset type: 中文知识笔记《对话历史的存储》的辅助解释图。
Primary request: 用一个本地 JSONL 文件的示意，展示新工具结果追加到同一会话的历史中，再按会话读回并选择本轮需要的历史。让读者直观看见：文件保存的记录多于本轮选入的消息；读回工具结果不需要重新执行工具。

Reference image:
/Users/lllllan/lllllan02/horizon/.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png：仅风格参考。迁移克制二维技术编辑插画、折角文档、自然柔和的轮廓和局部淡彩，不复制其内容或布局。

Style: 白底、充分留白、清楚规整的中文。深灰文字、中细灰蓝轮廓，适度圆角。实体有可辨认的形状：左侧是工具结果纸条，中间是带折角的文件与叠放纸张，右侧是一张较小的输入文档。不要把每个实体都画成同样的方框。无机器人、脑球、3D、厚阴影、渐变、粗黑描边、手写横幅、页尾结论。
Palette: #ffffff background; #374151 text; #64748b secondary; #a8b3c2 subtle borders; #416788 selected messages and read arrow; #eaf0f7 small selected fills; #b66a43 new appended record and write arrow; #fbf0e6 small new-record fill.
Aspect: landscape, about 3:2. Modest title top left “历史写入与读回”, smaller subtitle “本地文件 · 简化示意”.

Objects and relationships:
Left (~22%): one small paper slip labeled “新工具结果”, with “m7 · 结果 c2” and “日志片段”. It is vertically aligned with the bottom of the central file. One short straight orange arrow from this slip to the file’s bottom row, labeled “追加”. No tool execution icon.
Center (~38%): one folded document, with subtle sheets behind it, headed “已保存历史” and filename “session_01.jsonl”. Inside, seven visible ordered horizontal rows. Top four rows use neutral gray, remain fully visible and unmodified. Last three are selected in light blue; m7 also has a thin orange marker at the left indicating the new addition. Exact row texts:
“m1  用户消息”
“m2  工具调用 c1”
“m3  工具结果 c1”
“m4  模型回复”
“m5  用户消息”
“m6  工具调用 c2”
“m7  工具结果 c2”
These rows are a human-readable schematic of JSONL records, not literal serialized JSON. Do not draw JSON braces or invent fields.
Right (~28%): a smaller folded document headed “选入本轮的历史”, containing just three rows “m5  用户消息”, “m6  工具调用 c2”, “m7  工具结果 c2”, all light blue. Its top aligns with central m5 row. A single horizontal blue arrow connects the selected three-row region of the middle file to this smaller document. Label the arrow “读回并选择” and put a small “按会话 ID” just above it. Place the right heading above the smaller document, not squeezed into the arrow. Both c2 call and result must be included together.

Composition: left-to-right main flow, with the incoming slip low on the left to meet the appended last row, and the selected history low on the right at the same height as the central selected rows. Keep the large file visually dominant. No component boundary boxes, no branching storage alternatives, no separate model panel, no summary/compression panel, no output loop. The image depicts an illustrative selection; it does not claim these three records alone are the entire model input. Do not add footer sentences or explanatory panels.

Text, verbatim:
历史写入与读回
本地文件 · 简化示意
新工具结果
m7 · 结果 c2
日志片段
追加
已保存历史
session_01.jsonl
m1  用户消息
m2  工具调用 c1
m3  工具结果 c1
m4  模型回复
m5  用户消息
m6  工具调用 c2
m7  工具结果 c2
按会话 ID
读回并选择
选入本轮的历史

Semantic invariants: append m7 only once to existing m1–m6; gray m1–m4 remain stored when omitted from this input; m5–m7 retain order and original labels; c2 call and result remain paired; right document is the historical portion of an input, not a claim that no instructions or tools are needed. Tool results are read as stored data, not re-executed.
Validation priorities: legible accurate Chinese and filename; no clipped labels or overlapping arrow text; orange arrow meets m7; blue arrow starts at selected history and ends at right document; only m5–m7 are on the right; m1–m4 remain visible in the file. Match reference shapes, restrained color area and fine outlines.
```
