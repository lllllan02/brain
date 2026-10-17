Use case: infographic-diagram.
Asset type: Horizon 中文知识库 Agent 专题入口整体关系图，第三版试稿。
Primary request: 根据用户反馈重新设计图的结构，保留已有概念覆盖与认可的克制技术插画风格，让读者明确看见“能力作用于哪个输入、状态、执行点或证据”。完整重排，不要只把旧图里的方框搬位置。

Reference images:
Image 1 /Users/lllllan/.codex/visualizations/2026/10/17/01a14a7b-16e5-7671-9216-1ea6f2ff6f14/agent-overview/agent-overview-v2.png：内容参考与待改版对象。保留中文概念、清楚的对象造型，必须改变旧图的 Loop 容器和支持模块连线。
Image 2 /Users/lllllan/lllllan02/horizon/.agents/skills/excalidraw-diagram/assets/diagram-style-reference.png：仅画风参考。规整中文，文档、清单、文件柜、端口、记录条等有含义的简化造型，灰蓝细轮廓、小面积淡橙，不复制工具注册表内容。

Style:
克制的二维技术编辑插画，白色背景，深灰#374151文字，灰蓝#416788主要轮廓，淡填充#eaf0f7，实际动作少量暖橙#b66a43/#fbf0e6，灰色#a8b3c2表示边界和记录关联。所有中文清楚。线条中等偏细、适度圆角。不要机器人、脑球、齿轮、3D、渐变、发光、大色块、粗黑描边、手写标题、宣传语或总结框。
Canvas target:1920×1440px，紧凑4:3横向画面；意向显示宽度1000px。根据内容留足中文字号，主要标签在缩小后仍可读。输出尺寸参数不写在画面里。标题“Agent 整体关系”适度，不占大幅高度。

MOST IMPORTANT RESTRUCTURING:
A. 取消旧图包住大量内容的“Agent Loop”大矩形。Agent Loop 用一条实际的运行主干与反馈回路表达。所有能力箭头必须终止在具体节点、检查点、数据记录，禁止指向一个 Loop 大容器的边框。
B. “任务规划”明确在运行主干上方，属于 Harness 内的跨轮支持。画一份可勾选的“计划”清单，和一份“任务状态”便笺：目标、进度、当前步骤。小标签“任务规划”紧贴计划清单。计划/状态通过“当前步骤”向本轮上下文提供信息，执行反馈可“更新进度 / 必要时重规划”写回状态与计划。这只是跨轮可用信息，不画成每轮固定先执行规划。
C. 多 Agent 协作用具体委派与返回表达：从程序的“行动执行”节点分出“委派子任务”，到“子 Agent”独立小循环。小循环要看得出“判断 → 工具 → 反馈 → 判断”；成果用另一条“返回成果”线回到主循环的“实际结果”。不要从主 Loop 的边框或从结果节点发出委派。标“多 Agent 协作 · 主从委派示例”，说明这是协作的一种可选组织。
D. 其他能力要分别用数据对象、局部介入、贯穿记录带表达，不能一排方框加一排箭头指向整个循环。

Composition, 4 horizontal levels, suggested but adapt for legibility:
Top header/entry, shallow: “用户目标” → “意图识别” enters task state/context; “工作流：预设路径” and “Agent：动态决策” share a subtle “可组合” association. Top-right a small separate annotation “企业自建：缺口与收益” associated with Harness boundary. Do not make these choices mandatory sequential steps.

Main drawing has ONE light dashed outer boundary “Agent Harness · 运行系统”. This encloses the following upper state level and middle runtime area, not bottom evaluation.
Upper level inside Harness: plans and task state as tangible documents above model/context, outside the runtime cycle. Checkpoint snapshots nearby are associated with task state but draw their save association to an actual stable result point (not Loop boundary).

Middle level: a strong left-to-right main runtime:
“本轮上下文” → “模型决策” --“工具调用 · 名称与参数”--> “行动执行” → “实际结果”.
Add “Agent Loop · 运行主线” as a small label above this line, no big container.
A clear blue feedback line from actual results back to 本轮上下文, label “结果进入下一轮”. It visibly returns to concrete input, since program assembles updated input before model call.
“上下文管理” is shown as selection/assembly around a small stack of input pages, with selected pages “指令”“当前步骤”“工具定义”“证据”. On the left, “记忆” file cabinet and separate source pages “资料 / 工具定义 / Skill” feed this assembly through a small selection action “按需加载”; only a few selected pages enter input, not whole storage copied in.
“模型决策” network icon, no humanized robot.
“行动执行” concrete runtime/terminal panel. Under it, two optional execution ways:
- “工具执行”: file and API pictograms, with one small dashed sandbox boundary labelled“沙箱” around local “文件 / 命令环境”, remote service drawn just outside that small sandbox as“服务”. The runtime invokes tools before the actual result can exist. Connect action execution down to tools and tools back into actual results.
- “多 Agent 协作 · 主从委派示例”: independent small child-agent cycle as specified above, clearly separate from sandbox and returning成果 to main actual result.
Avoid a false arrow showing result before tool execution. Keep main horizontal sequence intuitive, use the down-and-up tool detour if needed.

Attach interventions locally, not to abstract overall container:
- “行为约束” has small shield check marks at three actual places: input assembly, before action execution, and before final output. Use tiny short labels “输入检查”“执行前检查”“输出检查”. No implication all security is just prompts.
- “重试” is a small local retry curved arrow attached to “工具执行”, with short condition “可安全重做时”. No giant retry module pointing to Loop.
- “人工介入” is a small person plus waiting slip at the pre-execution permission gate. Thin optional branch from gate labelled“需人决定”, and response returns to that gate labelled“回复后复核”. A saved wait state can connect to checkpoint snapshot. Do not imply every action needs approval.
- “反馈与调整” placed near the result feedback path with two small distinct operations “反思：分析偏差” and “自我纠正：修改并验证”. Label the connection “需要调整时”. There is no fixed retry→reflection→correction sequence. Attach to specific feedback and next action/updated input. Do not attach to overall Loop edge.
- “检查点与中断恢复” represented by saved snapshots and a small recovery arrow to “任务状态”/“本轮上下文”, with short note“恢复前核对已生效操作”. Show optional state save from a stable result point, not as each turn's mandatory step.
- At the right, “结束本次运行” is a genuine exit reachable from model final response/results, label“完成 / 暂停 / 达到限制”. Actual deliverable “实际产物” is a neutral paper document with a pending verification mark, no guaranteed-success tick. Pause/limit can report partial product.

Bottom level:
“执行追踪 Trace” is a thin event recording rail under the runtime, with small downward dotted taps from concrete model, tool-execution and actual-result points. Label those records“模型输入”“工具事件”“结果”. It spans execution as an observation layer, not a module pointing at the Loop.
“Agent 评测” sits outside Harness at lower right, receives both process evidence from Trace and actual product from the output. It checks “结果 / 过程约束 / 质量 / 成本”. No arrow from evaluation back into every runtime step, no fictitious benchmark scores.

Text to preserve, grouped and readable:
“Agent 整体关系”
“用户目标”“意图识别”“工作流：预设路径”“Agent：动态决策”“可组合”“企业自建：缺口与收益”
“Agent Harness · 运行系统”“Agent Loop · 运行主线”
“任务规划”“计划”“任务状态”“目标 / 进度 / 当前步骤”“当前步骤”“更新进度 / 必要时重规划”
“上下文管理”“本轮上下文”“指令”“工具定义”“证据”“记忆”“资料 / 工具定义 / Skill”“按需加载”
“模型决策”“工具调用 · 名称与参数”“行动执行”“实际结果”“结果进入下一轮”
“工具执行”“沙箱”“文件 / 命令环境”“服务”
“多 Agent 协作”“主从委派示例”“委派子任务”“子 Agent”“判断”“工具”“反馈”“返回成果”
“行为约束”“输入检查”“执行前检查”“输出检查”
“重试”“可安全重做时”
“人工介入”“需人决定”“回复后复核”
“反馈与调整”“反思：分析偏差”“自我纠正：修改并验证”“需要调整时”
“检查点与中断恢复”“恢复前核对已生效操作”
“结束本次运行”“完成 / 暂停 / 达到限制”“实际产物”
“执行追踪 Trace”“模型输入”“工具事件”“结果”“过程证据”
“Agent 评测”“结果 / 过程约束 / 质量 / 成本”

Semantic validation priority:
1 Planning documents outside main cycle, inside Harness, linked through actual current-step input and evidence updates.
2 Action execution → child delegation → child autonomous cycle → returned main result, explicit endpoints.
3 Each other capability touches an actual point/data object; no generic arrows ending on a Loop container.
4 Tool execution happens before its actual result. Blue result feedback returns to concrete input.
5 Some runtime nodes are on an ordered chain, some supporting capabilities are optional. Do not accidentally depict every mechanism as mandatory.
6 Preserve readable labels and clear exits. Keep connections short, mostly straight or one right-angle bend, no crossed labels or indecipherable spaghetti. Different shapes express information, execution, human decisions and observation.
Output one complete new image.
