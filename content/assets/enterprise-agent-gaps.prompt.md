Use case: infographic-diagram.
Asset type: 中文知识笔记的辅助解释图，最终单张横向图片。
Primary request: 用三个具体失效案例解释：当目标宿主没有开放必要控制时，“通用 Agent + 企业 MCP Server”仍然不足以满足业务要求，以及企业需要补哪种控制。重点是可见的不足与补足原因，不是组件职责图，不是文章提纲，不做自建产品宣传。

Reference image: /Users/lllllan/lllllan02/horizon/.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png 仅作画风参考，迁移对象造型、轮廓与淡彩、文字层级，不复制其内容和布局。
Style: 克制的二维技术编辑插画，白底、留白、规整且清晰的中文无衬线字。对象用真实可辨认的文档、上下文页、服务器小机箱、邮件信封、审批票据、任务记录、闸门造型。中等偏细的灰蓝轮廓，适度圆角，小面积淡彩。不要机器人、脑球、齿轮、立体平台、荧光、渐变、粗黑线、装饰符号。图有信息层级但文字不密集。
Palette: #ffffff 白底；#374151 深灰正文；#64748b 次要字；#a8b3c2 轻边界；#416788 / #eaf0f7 表示已有材料、已接通能力与正常路径；#b66a43 / #fbf0e6 表示缺失、错误尝试与需补控制。
Aspect: 横向约 3:2，高分辨率，适合笔记阅读。标题适中，不占过多高度。

Composition: 标题区之下，三条平行的水平故事带，从上到下分别为“上下文保留”“跨工具权限”“任务接续”。每条从左到右展示：具体业务要求与现成方案的处理 → 可见的失效 → 企业要补的控制。中间失效过程占最多宽度，右侧补足约占四分之一。每条用少量物件和直接水平箭头讲清，不画成满屏相同方框，不做大面积背景色。三条之间用很浅的细线或留白分隔。页面上方的小副标题明确限定“示意：目标宿主未开放所需控制时”。在三个右侧补足区域上方只出现一次列标题“需要补的控制”。没有页尾总结区。

Row 1 — 上下文保留：
左侧原始任务页中有两条独立的小纸条：“A 单可退”“B 单先别动”。从原始任务页经过一个表示“历史压缩”的收窄纸张转换到“当前上下文”页；当前页可见“A 单可退”以及 MCP 返回的蓝色查询结果“A、B 均可退”。但“B 单先别动”这张暖橙色纸条在压缩处掉落到页外，不进入当前上下文。务必通过纸条位置和丢失关系展示遗漏，不能只写“丢失”。当前上下文右侧生成一张暖橙色动作提案“尝试退 B 单”。这里只是模型提出错误操作，不能画成已真实退款。右侧补足画一个独立持久任务夹，里面牢牢固定“B 单先别动”，再以一条短箭头送进每轮上下文。补足短标签“任务约束独立保存”“每轮保留”。从原始用户指令到压缩到错误提案的流向必须从左到右。MCP 资料本身正确，缺口在保留任务约束。

Row 2 — 跨工具权限：
左侧需求纸条“客户资料仅供内部分析”。蓝色企业 MCP Server 小机箱经过一扇标为“读取获准”的小门，将客户资料文档送入通用 Agent 的工作区。工作区再通过独立的“邮件工具”把该文档装进信封，向右寄到“外部地址”。在读取路径上有检查门，但邮件外发路径没有门，呈现出一个现有检查未覆盖的出口。用暖橙色路径和信封突出这个外发风险。不要暗示 MCP 没有权限机制，不要把资料服务的读取检查画成失效。右侧补足将同样的邮件出口放入“统一出口校验”小闸门，外部地址被拒绝，保留资料在内部。短标签“外发拒绝”。明确它是另一个宿主工具的出口，企业 MCP Server 不能单独约束它。

Row 3 — 任务接续：
左侧需求纸条“审批后自动继续”。蓝色 MCP Server 保留审批任务票据，画出从“待审批”到“已批准”的真实状态变化。这个后端操作保持可用。旁边通用 Agent 的会话窗口已经关闭或暂停，右侧表示后续工作的“下一步”任务条为空白，审批票据到该任务条之间有明显未接续的间隙，短注“主任务未唤醒”。不要画成 MCP 后端任务一定随断线丢失。右侧补足画一个独立的“持久任务”记录本，接收“批准事件”的通知，再连接到亮起的“继续执行”任务条，短标签“事件唤醒”。这行说明拿到长任务状态不等于宿主自动恢复业务任务。

Text verbatim:
Title: “通用 Agent + MCP，何时仍然不够？”
Subtitle: “示意：目标宿主未开放所需控制时”
Column heading at right: “需要补的控制”
Row labels: “上下文保留”“跨工具权限”“任务接续”
Use only the short object labels and conditions specified in the three rows. Do not add explanatory paragraphs, a conclusion slogan, product logos or new features.

Semantic invariants:
1. These are conditional gaps of the chosen host/integration, not inherent impossibilities of MCP.
2. Server tools and data can already work correctly; show the missing whole-task controls.
3. Errors must be visible in concrete object relationships even without their error labels.
4. The right-hand controls are capabilities the enterprise must obtain, by extension, integration or self-building where necessary; do not label them “自建必然解决” or imply rewriting every component is required.
5. Keep every row easy to read, generous type size, no tiny footnotes.
