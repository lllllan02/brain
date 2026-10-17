Use case: infographic-diagram.
Asset type: 一张中文知识配图，横向约 3:2，高分辨率。
Primary request: 画一个完整、统一的“通用 Agent + MCP Server”方案架构，并直接在架构的对应位置用橙色标出该方案仍可能不足的控制点。主画面必须是一套实际连接的系统，读者先看懂整体如何工作，再看懂哪些业务要求仅接入 MCP 仍不能保证。不要画成三个案例、三行对照、方案优劣表或多个独立小图。

Style reference: /Users/lllllan/lllllan02/horizon/.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png 仅风格参考。迁移文档、文件夹、服务器、端口等对象造型，细灰蓝轮廓、局部淡彩、层级与留白；不复制其内容与布局。
Style: 白底、克制的二维技术编辑插画。规整易读的中文无衬线字体，适度圆角。对象有具体形象，不是全屏同样的矩形文字框。主架构用灰蓝 #416788 与浅蓝 #eaf0f7，轮廓 #374151，轻边界 #a8b3c2；需要补足的控制用暖橙 #b66a43、少量浅橙 #fbf0e6 和虚线。不要大面积彩色背景、机器人、脑球、齿轮、立体平台、渐变、阴影、页尾口号。标题适中，标签贴近对象。内容宁少勿密。

Title verbatim: “通用 Agent + MCP：能力与缺口”
Small subtitle verbatim: “橙色：业务需要，但目标宿主未提供或未开放的控制”
Subtitle is an essential condition, not a tiny footnote.

Main architecture:
- Left: a simple user/request document labeled “用户任务”, an arrow into one large dashed blue-gray boundary labeled “通用 Agent（宿主）”.
- Inside this boundary show a coherent Agent loop: a small stack of documents labeled “上下文” → a model-call node with simple connected-dot symbol labeled “模型决策” → an operation routing object labeled “工具执行”. Keep the main flow left to right.
- The host contains a distinct small connector/port labeled “MCP Client”, connected from “工具执行”.
- Outside the host boundary, to its right: a recognizable blue-gray server stack labeled “企业 MCP Server”, connected with MCP Client. Two separated short parallel arrows, or a clear bidirectional connection, indicate “调用” and “结果”.
- Farther right: business objects connected to the MCP Server: one small database cylinder labeled “业务系统”, and a folder of documents labeled “企业知识”. Inside/beside the Server use a small short label “工具 · 资料 · 业务流程”. This shows that Server can already have substantial backend capabilities.
- At the Server-to-business-system entry draw one clearly existing blue checkpoint/door labeled “本服务权限”, so the diagram does NOT imply that MCP has no permission controls.
- Show a clear feedback connection returning tool results from MCP Client to “上下文”, labeled “结果回传”, forming an Agent loop. This feedback is important; tools must not appear as a one-way dead end. Route gently and simply, without crossing node labels.
- “工具执行” also has a separate branch to another recognizable tool outside the MCP path, such as a small mail envelope/tool window labeled “其他工具”, with a nearby short example label “邮件 / 文件”. This path does NOT go through the enterprise MCP Server. The branch must be visually separate from the MCP branch.

Add exactly THREE orange gap callouts in situ, all belonging to the SAME architecture, not a separate sidebar comparison:

1. At “上下文”, preferably just above this actual document stack:
Orange outline callout heading “需补：上下文控制”
Two short lines: “关键约束保留” and “证据选取与压缩”
Use a short dotted orange pointer that lands precisely on the context-document stack. Inside the blue context stack there are actual paper strips; an orange strip labeled “任务约束” lies partially outside the selected context, while blue evidence pages from MCP enter the context normally. This small visual mismatch makes the insufficiency concrete: Server supplied materials, but cannot force which constraints the host retains. Do not suggest all general Agents have no context management; the blue stack represents existing default management, orange represents the business-specific control the target host does not expose.

2. At the “工具执行” branching point and its exits:
Orange outline callout heading “需补：统一执行约束”
Two short lines: “跨工具授权与审批” and “最终输出校验”
Use orange dotted bracket/pointer to visually cover BOTH the MCP route and the separate “其他工具” route. The existing blue “本服务权限” gate protects only the enterprise MCP path; the other branch visibly bypasses that local gate. This should make it clear why local Server permission checks cannot alone enforce the whole host’s policy. Orange is an unmet control requirement, not an existing functioning global gateway. Keep orange annotations readable, do not tangle lines.

3. Outside the host boundary, below or lower-left, at the link from business events back into host execution:
Orange heading “需补：任务生命周期”
An orange dashed-outline task ledger/book labeled “持久任务”, with small recognizable clock/event ticket on its left labeled “业务事件”. Connect the event to ledger and ledger to the host with dotted orange arrows.
Two short labels near this mechanism: “触发与调度” and “等待后接续”.
This is a missing application/task orchestration capability when the host lacks it, distinct from a Server tool being able to run an asynchronous operation. The ledger should show task entries and a waiting/continuing state, not just a generic rectangle. Orange dashed arrows mean control still needs to be supplied. The existing main blue Agent loop remains visible above it.

Semantic invariants:
- This is one general Agent + MCP architecture WITH annotated gaps. Main architecture is the visual subject. Do not reuse the previous three-row failure-case layout.
- Server can already supply tools, knowledge, workflow and per-service authorization. Its limitation is that a protocol connection does not grant full control over the host's context, other tool paths, output, or whole-task lifecycle.
- Conditional phrasing in subtitle is mandatory; these are gaps of the target host/integration, not universal limitations of every generic Agent or inherent impossibilities of MCP.
- Orange annotations point to precise control locations within/around the main architecture. Do not create a separate “自建 Agent” product box or imply self-building everything is required.
- No extra summary paragraph, no footer, no additional fourth callout, no code or product logos.
Validation: clear host containment, MCP Client inside Host and Server outside, correct request/result direction, complete feedback loop, distinguish Server-local gate from cross-tool control, legible Chinese and generous spacing.

## Routing refinement

Edit the supplied Chinese architecture illustration. Preserve its overall composition, typography, title, subtitle, all three orange in-situ gap annotations, main components, palette and visual style. Make ONLY the following semantic routing corrections:
1. Complete the blue MCP feedback loop. Currently the blue “结果” arrow from 企业 MCP Server ends at MCP Client, while only 其他工具 visibly returns to the context papers. Add a clear blue solid return path FROM MCP Client INTO the existing “结果回传” path, finally entering the context papers. This MCP-result return must NOT pass through the 其他工具 box and must NOT flow through the outbound tool-invocation branch. Adjust nearby spacing/line routing only as necessary, keeping labels readable and connections uncrossed where possible. Both MCP tools and other tools should clearly feed results back into 上下文. Add the short label “上下文” near the actual context document stack if room is needed to make the destination explicit.
2. Simplify the orange task-lifecycle return path: 业务事件 → 持久任务 → 通用 Agent should be a clear directed dashed-orange chain. There should be ONE visible upward orange arrow from the task ledger to the host’s lower border, meaning “等待后接续”. Remove the confusing left-pointing arrow into the task ledger from the same branch. Keep the orange “需补：任务生命周期” callout visually attached as an annotation, not as another executable node in the arrow chain.
Do not add more explanatory text or new features. Preserve the condition in subtitle that these controls are not provided/opened by the target host, rather than universal MCP limitations. Output one finished high-resolution image.

## Arrow correction

最终将 MCP Client 的回传线源端改为圆形连接点，仅在上下文接收端保留箭头。

请编辑这张图，只改一个清楚可定位的细节：在图中央偏右、写着“MCP Client”的小框正下方，现在有一个向上的蓝色三角箭头。把这个三角箭头完全去掉，改成一个明显的蓝色实心圆形连接点（不是三角形，不是箭头）。圆点应落在 MCP Client 底边与下面蓝色连线相接的位置。该连线表示客户端返回工具结果，只在左边“上下文”的接收端保留箭头即可。MCP Client 底边这里务必只能是一个圆点，不能残留任何朝上的三角。其他图形、结构、文字与配色保持不变。

Make a minimal correction to this exact image; preserve everything else pixel-for-pixel as closely as possible. The new blue feedback wire that touches the BOTTOM of the MCP Client box currently has an UPWARD triangular arrowhead pointing INTO MCP Client. That is wrong. REMOVE that upward triangle entirely. At the same bottom connector, draw a small DOWNWARD blue arrowhead on the wire, clearly pointing AWAY FROM MCP Client and DOWN toward the horizontal feedback bus. The path must read: MCP Client → down the blue wire → left along the result feedback bus → up into 上下文. Keep the existing arrows that enter 上下文, and all other components/labels/colors exactly as they are. Do not reverse the Server→Client result arrow. Do not add any new box, callout or text. This one arrow direction is the sole requested correction.
