# 任务状态字段更新配图

- 生成方式：内置 imagegen；位图插画。
- 风格参考：`.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png`（仅风格）。
- 对应图片：`agent-task-state-update-fields.png`。

```text
Use case: infographic-diagram.
Asset type: 中文知识笔记中的辅助解释图。
Primary request: 解释新信息怎样改变同一份任务状态，以及模型判断更新内容、程序校验保存的分工。用修复登录的一个假设例子。生成一张完整清晰的横向中文技术编辑插画。

Reference image:
- /Users/lllllan/lllllan02/horizon/.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png：仅风格参考。迁移具体对象造型、柔和细轮廓、留白、局部淡彩与中文层级；不复制参考图的业务内容、布局或大号标题。

Style: 克制的二维技术编辑插画，白底，干净规整的中文无衬线字体。文档用折角纸页与页签表现，测试结果用一张小报告纸条，程序保存用小型文件托盘/存储盒表现；模型可用一个小网络符号加文字。所有物体平面、轻柔线条、形象简约但非单调流程方框。不要机器人、发光脑球、齿轮、3D平台、粗黑边、渐变、高光、厚重阴影、手写标题、页尾总结或装饰徽章。
Palette: white #ffffff; text and main outlines #374151; secondary text #64748b; fine borders #a8b3c2; neutral light #f8fafc; blue-gray #416788/#eaf0f7 for comparison arrows and test report; warm orange #b66a43/#fbf0e6 ONLY for updated fields on the right and their immediate input path.
Aspect: wide landscape around 1.9:1, high resolution, generous whitespace, all Chinese labels large enough to read in a note.

Composition and exact objects:
- Main reading direction is LEFT TO RIGHT with no numbered steps.
- A moderate title at top left: “任务状态怎样更新”, a small subtitle “修复登录 · 假设示例”.
- LEFT about 25%: a standing folded-corner task-state document with heading “当前状态”. It contains three clearly separated rows:
  “目标：修复登录”
  “进度：等待测试”
  “下一步：运行测试”
  Keep this document pale neutral. A straight gray-blue arrow from its right edge goes into the model comparison area in the center.
- CENTER about 45%: at the upper middle, a small test-result report sheet titled “新信息”, with “测试结果：登录测试失败”. A short downward arrow connects that report to the model just beneath it.
  Model is at the same main horizontal level as the state documents, labeled “模型” and below it “对照状态，判断变化”. It receives BOTH the current-state arrow from the left and new-information arrow from above.
  From the model a short right-facing arrow labeled “提交更新” goes to a small storage/program object labeled “程序”, with short sublabel “校验并保存”.
  From the program another right-facing arrow goes directly into the updated task-state document on the right.
  Do not draw an extra duplicate document listing the update patch.
- RIGHT about 25%: another standing folded-corner document, clearly the same kind of task-state record as on the left, titled “更新后状态”. Same row order and alignment:
  “目标：修复登录” in pale gray, with a small secondary tag “保留”.
  “进度：测试失败” on a light warm-orange row.
  “下一步：根据失败原因继续修复” on a light warm-orange row, wrap naturally into two lines if needed.
  A small tag “更新” can sit adjacent to the two orange rows together.
  The unchanged goal must remain exactly the same as the left. Only progress and next step change.
- The program genuinely saves the update: arrow must connect model -> program -> updated state. Do not connect the raw test report directly to updated state.
- There is no conflict handling, no order A/B scenario, no user approval step, no execution of the proposed next action. The updated next step is still future work.
- Do not add a footer, slogan, summary panel, legend, large colored backgrounds, or any text beyond the listed labels.

Text, verbatim:
任务状态怎样更新
修复登录 · 假设示例
当前状态
目标：修复登录
进度：等待测试
下一步：运行测试
新信息
测试结果：登录测试失败
模型
对照状态，判断变化
提交更新
程序
校验并保存
更新后状态
目标：修复登录
进度：测试失败
下一步：根据失败原因继续修复
保留
更新

Validation priorities: exact Chinese text, readable layout, arrows in the correct directions, two inputs meet at the model, model judges and program saves, unchanged goal vs changed progress/next step obvious through stable row positions and restrained color. Show concrete changes in record contents, not just labels in process boxes.
```
