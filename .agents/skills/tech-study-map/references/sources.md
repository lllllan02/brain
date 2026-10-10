# 来源与适配边界

复核日期：2026-10-10。下列条目记录实际读取的上游主文件、采用的方法、在本技能中的落点和不采用的部分。上游技能本身也是作者编写的操作指令；有出处不等于经过实证验证，更不能拿技能文件替代 Kafka、Redis 等技术事实的官方来源。

本次参考五个仓库中的六个 MIT 技能；许可原文见 [LICENSE.txt](../LICENSE.txt)。原有三份来源重新下载后的文件哈希一致。GitHub 提交查询未成功，以下仍记录 `main` 链接与实读文件的 SHA-256，不将其称为固定提交链接。

## S1

[github/awesome-copilot — skills/technical-job-search/SKILL.md](https://github.com/github/awesome-copilot/blob/main/skills/technical-job-search/SKILL.md)

- 原文定位：Job Description Analysis。
- 采用：明确必需、加分与岗位业务问题。
- 本地落点：保留在“识别值得学习和补充的内容”的 JD 规则中，用 JD 原文说明为什么要学。
- 不照搬：上游将多次提及也归为必需、只出现一次也归为加分，依据不足；本技能只按明示措辞分类，将其他判断作为推断。求职信、报价与跟进流程不采用。
- 证据局限：仅借鉴 JD 拆解；仓库由 GitHub 托管并不代表该条规则经过招聘效果验证。
- 文件 SHA-256：`b24b015e51c01407c079328f5cd5878e887e002b9f975bb3509a4d099dfc6df8`

## S2

[HermeticOrmus/learning-skills — skills/learning-roadmap/SKILL.md](https://github.com/HermeticOrmus/learning-skills/blob/main/skills/learning-roadmap/SKILL.md)

- 原文定位：Prerequisites、Assessment 与末尾的顺序建议。
- 采用：识别前置知识，按依赖安排学习顺序，以目标判断进展。
- 本地落点：保留在“范围与前置”和“学习要求／待学清单”；不要求固定学习顺序或强制展示全部路线。
- 不照搬：主体是带占位项的简短路线模板，未提供课程选择算法或学习效果证据。默认专家目标、开源贡献和九段输出不采用。
- 证据局限：这是较弱的结构参考，不能作为本技能核心有效性的证明。
- 文件 SHA-256：`cab65f40b27830b9ba3da507a8477096b4d013883ae561b8270397f70a19482c`

## S3

[vanderbilt-data-science/knowledge-spaces — .claude/skills/decomposing-learning-objectives/SKILL.md](https://github.com/vanderbilt-data-science/knowledge-spaces/blob/main/.claude/skills/decomposing-learning-objectives/SKILL.md)

- 原文定位：Step 6: ECD Assessment Validation；Step 7: Decomposition Process。
- 采用：学习目标、能够支持目标判断的表现证据、引出这些表现的任务需对应；目标包含动作、对象和条件，并保留来源。
- 本地落点：落实在“把建议落实为可判断的问题”：为什么需要、要做到什么、什么结果支持判断、哪个问题能推进或检验。若题目只能测定义，就不能声称覆盖实现能力。
- 不照搬：不采用五套分类、JSON 图谱及见复合目标就拆原子的流程；目标拆分以可讨论性与项目卡片规则决定。
- 证据局限：上游自称采用 ECD，本次核对的是技能中的方法表达，未复核其引用论文或证明这份改写具有教学效果。
- 文件 SHA-256：`4e1e9bc21843367de9eeafe3f786d7be4cf9f57db8e8cced6b33f19eb190ddd0`

## S4

[Hazehacker/backend-interview-simulator — SKILL.md](https://github.com/Hazehacker/backend-interview-simulator/blob/main/SKILL.md)

- 原文定位：一问一答原则、项目深挖、评分与反馈。
- 采用：追问来自已有回答，沿机制、边界、取舍和验证深入；未知与答错区分，已覆盖内容不重复。
- 本地落点：落实在“随讨论继续推进”：先指出具体未决处，再选择深入方向；实现检查联系故障和证据。
- 不照搬：不采用身份配置、强制一问一答、语言冻结、阶段评分或固定职级范围；生成清单仍可一次列多个问题。
- 证据局限：这是模拟面试技能中的操作规则；没有证据证明其题目能预测真实公司的面试。
- 文件 SHA-256：`c50954b40ba70a6060fe97c6816da1ad8a2e2d7d06f646cfa4cc5796a2883dea`

## S5

[coinluu/resume-jd-optimizer-cn — SKILL.md](https://github.com/coinluu/resume-jd-optimizer-cn/blob/main/SKILL.md)

- 原文定位：诊断与解析规则、素材追问规则。
- 采用：要求对应具体材料证据；区分弱表达、证据不足与真实缺失；优先追问会改变判断的缺口。
- 本地落点：落实在“把建议落实为可判断的问题”：核对卡片实际覆盖的关系，区分已说明、解释不足、范围内未找到与待确认；据此选择阅读、补解释或新问题。
- 不照搬：从简历证据映射迁移到知识卡片审视是本项目的改写，不是上游原有能力；不采用简历评分或自动生成投递材料。
- 证据局限：材料缺项不能证明用户不会，也不能证明技术方案错误；本次仅复核主文件有关规则，未宣称审查了整个仓库全部评分器。
- 文件 SHA-256：`53e87baf7dbcb04b00c37094879b18f74402d81ec91c8a4e0bd1fc0700cc915d`

## S6

[HermeticOrmus/learning-skills — skills/learning-practice/SKILL.md](https://github.com/HermeticOrmus/learning-skills/blob/main/skills/learning-practice/SKILL.md)

- 原文定位：Exercise structure 及 For each exercise。
- 采用：练习有明确任务、预期结果和按需提示，难度逐步提高。
- 本地落点：落实在“形成有用的输出”的练习要求：输入和约束、任务、预期结果及验证方式；可围绕同一目标增加约束。
- 不照搬：验证方式是与 S3 及项目实现目标结合的适配；不强制四级练习，不默认展示完整解答。
- 证据局限：原文也是短模板，仅补充任务可执行性，不构成独立学习系统。
- 文件 SHA-256：`f01b9079d2caf7d9f53046a943970aabb4bbe8ce041bb6d701b75eefab3e2036`

## 比较后未引入的新依赖

- [jennifer88huang/interview-skills](https://github.com/jennifer88huang/interview-skills/blob/main/SKILL.md)：复核 Step 4 的考察点与追问结构及后面的轮次说明。题目关联来源的思路有用，但已由 S3、S4、S5 提供更具体的依据；不复制其模板。公司风格与未经来源支持的淘汰率不采用。本次仍未确认该仓库许可证，未将其列为代码或文案改写来源。
- [sourikduttanyu/interview-prep](https://github.com/sourikduttanyu/interview-prep/blob/main/skills/interview-prep/SKILL.md)：复核 JD 技术清单、优先级、已确认／推断区分，以及生成文件与日程的流程。前几项有价值但被 S1、S2、S5 覆盖；默认完整准备包、强制确认及两周日程不适合本项目。
- 本地 [interview-coach](/Users/lllllan/.codex/skills/interview-coach/SKILL.md)：复核证据约束和 JD decode 的相关内容，支持“有依据再判断”的方向，但未作为本次新增改写来源或依赖；其评分、状态文件与求职命令没有移入本技能。

## 用户要求与项目适配

开放输入、不限制为两种模式、普通主题规划不自动查库、按需审视卡片、随讨论调整、获准后保存，直接来自本次用户要求及项目 [AGENTS.md](../../../../AGENTS.md)，不是上游技能已经实现的完整链路。实现检查中的具体维度是对用户目标和 S3、S4 的工程化适配，不是固定的行业考纲。

## 验证能说明什么

格式检查只说明元数据和文件结构有效；来源核对只说明借鉴关系可追溯。此前所称“场景推演”是编写者的手工检查，没有独立模型运行记录，也没有长期学习反馈；不能算行为效果已验证。后续用 [场景检查](evaluation-cases.md) 保留实际输出并检查关键行为，明确区分自查、独立验证与用户反馈。未确认可靠安装量，不以星数或作者身份推导效果。
