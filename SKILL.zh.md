# Website Replication（中文导读）

> 这份文件是 [SKILL.md](SKILL.md) 的人类阅读版镜像，覆盖 Workflow / Evidence Safety / Common Misses / Configuration / Troubleshooting 五段。**Agent 加载的是英文版 SKILL.md**，这里仅为使用方查阅方便。
> 英文版有任何变更时，本文件同步更新；若两版冲突，以英文版为准。

## 保真：行为优先 + 双向（Fidelity Is Behavior-First And Two-Directional）

审计文档详尽 ≠ 复刻保真。下面四条是事后复盘的教训——每条都是「看着像做完了」却被人工抓出的真实漏点，优先级高于「渲染出来就算复刻」的惯性：

- **没观察到的交互功能不准复刻，绝不猜。** 静态抓取、公开 / 落地 / 营销页、首屏 DOM 都看不到登录后的客户端交互：某个 *Share / 收藏 / More / 下载* 控件**到底干什么**、弹出什么对话框、展开什么级联、生成什么链接——`WebFetch` 和 HTML 快照一概看不到。要复刻任何交互 / 鉴权后的功能，**必须驱动登录态产品、亲手触发该功能**，抓真实的对话框 / 流程 / 结果。够不到就标 `blocked`、什么都不复刻——一个看似合理的猜测（「Share 就是复制个链接」）是最贵的漏，因为它看着像做完了、没人复核就上线。
- **抓全量全深度——代表性样本就是内容缺口。** 多级「分类 → 子分类」级联、几十项，不是用几个顶层项就算复刻了。把每个菜单 / 级联 / 列表展开到最深一层，记录**每一级的每一项**。样本当成品，读起来像「做完了」。
- **反查自己的复刻品 vs 源站——保真是双向的。** 审计覆盖的是**源站**，从不会 catch 你**自己 build** 错的东西。两个方向都真实：
  - **欠建（死 stub）：** 看着复刻了的控件——tab、kebab 菜单项、开关、副面板——但没接线、没后端。要么让它**和源站完全一致地工作**，要么干脆不放。绝不上线只是「看着像」的空壳。
  - **过建（幽灵功能）：** 源站**没有**的控件 / 功能，自己拍脑袋加的。只复刻存在的；源站没有的一律不加，发现就移除。
- **前端触发器没连上数据和后端依赖就不算复刻完。** 详情 / 预览动作需其底层数据真的取到并存好；受限动作（授权、升级、导出、付费下载）需其权限 / 订阅 / 配额校验；分享动作需链接指向的公开页面真实存在。触发器连到空数据（置灰、空、死链 / 裸链）就是漏。逐功能追其数据 + 后端依赖，用真实数据在各状态下验证它能用——而不只是按钮渲染出来了。

## 到达登录态——暂停并交给用户登录（Reaching Logged-In State）

最值得复刻的行为（对话框、受限动作、账号 / workspace 状态、提交后流程）通常都在**登录之后**。当某个 in-scope 状态需要鉴权而你够不到时，**不是**直接标 `blocked`，而是**暂停、请用户替你登录**，然后继续。用户用自己合法账号登录**不是绕过鉴权**，是到达该状态的正常方式。只有当用户拒绝、无法到达、或那是他没有的付费 / 私域层级时，才标 `blocked`。

1. **一次问全。** 暂停前，列出你需要观察的所有登录态状态 / 流程（分享弹窗、收藏、受限下载、提交后结果…），让一次登录覆盖全部——别每个功能暂停一次。
2. **暂停交接。** 请用户把你带到登录后的产品前，并确认就绪。**绝不索要、输入或存储用户密码**——由**用户**鉴权，你只观察。
3. **继续抓取。** 驱动登录态会话、逐个触发功能、证据标 `observed`。按 *证据安全* 脱敏会话痕迹（cookies、token、账号 ID）。
4. **兜底。** 用户无法 / 不愿交接，就把这些状态标 `blocked`，用公开文档补 `documented`，并显式标注由此带来的复刻风险——不要猜隐藏行为。

交接方式（按 harness 与用户许可任选；都让用户掌控自己的凭证）：

- **用户已登录的浏览器 + CDP(首选)。** 用户已登录、开着远程调试端口；你 `connectOverCDP` 接上去驱动。浏览器不允许在**占用中的默认 profile** 上开调试，所以常见做法是：把用户的浏览器 profile 拷到临时目录、用调试端口启动那一份（带着现有登录态），连上、驱动、用完删临时副本。会话归用户，你看不到密码。
- **把已认证会话交进一次性上下文。** 用户把一个已认证会话（一次性 magic link，或他自己签发的 session）灌进全新浏览器上下文。当机密处理——用完即弃，绝不持久化或打日志。
- **用户操作、你观察。** 自动化够不到时，用户点流程、你截图 / 共享屏幕来抓。慢一点，但仍算 `observed`。

## 证据安全（Evidence Safety）

- 保存或上报证据前，脱敏一切机密与个人数据：cookies、Authorization 头、session ID、token、账号 ID、客户数据、上传文件内容、可能含私域内容的消息 / prompt 文本、一次性 URL。
- Network trace 只记 method、route pattern、auth class、脱敏后的 payload 形状、response 形状、status code、error class。**不要**粘贴带凭证的原始 header 或完整私域 payload。
- 尊重访问边界。需要付费 / 鉴权才能到达的状态若当前不可达，标 `blocked`，仅从可见证据或官方文档做推断。
- 审计输出落在**使用方项目**目录下（不是 skill 仓库自己）。在使用方项目 `.gitignore` 加入下面这段，让截图与 MANIFEST 进 git，DOM / 网络 / 报告留本地：

  ```gitignore
  audit/**/*.html
  audit/**/*.htm
  audit/**/*.har
  audit/**/*.har.gz
  audit/**/*.json
  audit/**/*.md
  audit/**/*.txt
  audit/**/*.log
  audit/**/*.csv
  !audit/**/MANIFEST.md
  audit/**/network/
  audit/**/dom/
  audit/**/reports/
  ```

  Commit 截图前必须肉眼审一遍 PII（用户名、邮箱、客户内容、内部 ID）。需要最严的隐私时，整段替换成一行 `audit/`。

## Workflow（九步）

1. **定义范围与证据**
   - 列出所有 in-scope 页面、路由、tab、mode、drawer、modal、submit 后状态。
   - **先读 `audit/<site-slug>/MANIFEST.md`**（格式：[references/manifest-template.md](references/manifest-template.md)）。对每个 URL × viewport × auth 组合查表：命中且 `Last Captured` 在 cache window（默认 30 天）内 → 复用旧 snapshot 与 DOM，evidence 行标 `observed (cached from <date>)`，不重截。未命中或过期 → 新截，写回 manifest。manifest 不存在就用模板头新建。
   - 先把页面拆成命名区域（shell / sidebar、主工作区、次级面板、底部 action rail 或播放器、全局 overlay），记录区域之间如何互相影响；step 3 会正式建模，但这里先建立观察边界。
   - 只对未命中的 URL 截桌面 + 移动端截图。整页截图 + 关键组件特写。
   - 保存脱敏证据：截图、控件清单、网络调用、console errors、以及一份**结构化 DOM 快照**。DOM 快照三选一：(a) 浏览器 MCP 自带的 a11y 树工具（chrome-devtools-mcp 的 `take_snapshot` 等）首选；(b) 跑 [references/dom-distill.js](references/dom-distill.js) 产出 markdown 大纲，比原始 outerHTML 小 50-100×，框架噪声已剔除；(c) 实在不行才存 raw `outerHTML`，存盘后**不要再读回 context**。**禁止**直接 `evaluate` `document.documentElement.outerHTML` 进 agent context——这是 skill 警告的最大 token 黑洞。网络抓包**永远新抓，不复用**。
   - 动态页面要在交互后再观察，不能只看首帧。
   - 每条主流程都要捕获 submit 前、进行中、完成后、空态、筛选 / 选中态、移动端态。不要假设 examples / showcase / 空态在有真实用户内容后仍然保留。
   - 每个 claim 标 `observed` / `documented` / `inferred` / `blocked` / `not applicable`。复用证据仍是 `observed`（30 天窗口是可靠性预算）。

2. **抽取 UI 系统**
   - 在浏览器 MCP eval 里跑 [references/design-tokens.js](references/design-tokens.js)。脚本对可见元素做 `getComputedStyle` 直方图，输出"色彩 / 字体 / 字号 / 圆角 / 阴影 / 间距"的 top 值表 —— 直接拿来填 Visual Tokens 段，不要靠眼力估 CSS。
   - 文档化布局、网格、shell / 导航、密度、间距、圆角、边框、色彩、字体、媒体处理、阴影、动效——脚本给数字，你写综合。
   - 文档化布局关系，而不只是单个组件：列宽比例、何时堆叠、谁拥有滚动、sticky / fixed 底部栏、sidebar 是否有独立底部区、列表是分页 / 内部滚动 / 页面滚动，以及全局控件的碰撞规则。
   - 建组件清单：导航、卡片、tab、segmented control、输入框、上传、chip、工具栏、modal、drawer、结果项、history、gating UI。
   - 用**目标产品自己的 token 与文案**写 HTML/CSS 示例，仅演示结构模式（如 icon + label 的 flex 布局）。不要粘竞品 class 名、精确间距、文案。
   - UI 差异化是有意为之：保留交互逻辑与字段结构，改 branding / 文案 / 图像 / 视觉节奏。

3. **建模页面区域与关系**

   在交互探测前，先用 [references/region-model-template.md](references/region-model-template.md) 建 Page Region Relationship Model。区域不是视觉盒子，而是语义职责边界：生成工具框、结果展示区、历史列表、编辑画布、结算摘要、设置抽屉、预览区等。

   - 给每个主要区域分配稳定 `Z*` ID。证据来自截图位置、DOM landmark、a11y tree、inventory ID、bounding box。
   - 每个区域必须写：purpose、owned state、consumed state、emitted events、updated regions、empty/loading/error/success states、responsive behavior、source、confidence。
   - 每个区域必须写 **Region Layout Constraints**：Placement、Anchor Target、Positioning Mode、sizing rule、scroll behavior、layering / containment、responsive transform、Collision Rules、evidence、source、confidence。`bottom-docked`、`sticky within container`、`fixed to viewport`、`overlay`、`independently scrollable`、`safe-area-aware`、`keyboard-avoiding` 这类术语都放在这里。
   - list / workspace 类产品要显式建模：列表容器、folder / collection 导航、active selection、分页 / 内部滚动、filter summary、footer alignment。这些是区域职责，不是纯视觉细节。
   - 显式建模跨区域依赖。例如：`Z1 Generator Panel -> submit payload -> Z2 Results Panel -> loading/result/error`；`Z3 History -> restore job -> Z1 form + Z2 result`。
   - auth、credits、selected item、current job、cart、permissions 等影响多个区域的共享 / gating state，要作为独立依赖处理。
   - implementation-ready audit 必须有 region relationship table，且至少有一个关系图或状态机。未知关系标 `inferred` 或 `blocked`，不要省略。

4. **枚举并探测交互**
   - **先枚举，再点击**。在浏览器自动化里跑 [references/dom-enumeration.js](references/dom-enumeration.js)（DevTools 控制台 eval 或 browser-MCP 的 eval 接口）。markdown 输出保存为 `audit/<site-slug>/snapshots/<date>/<page-slug>-inventory.md`，格式见 [references/inventory-template.md](references/inventory-template.md)。脚本已处理选择器优先级、shadow DOM 穿透、`cursor:pointer` 探测，**不要自己重新发明枚举逻辑**。
   - 按 ID 逐行走 inventory。先把每行映射到 `Z*` 区域，再填 `Probed`（`✓` 点过 / `o` URL/属性观察 / `✗` 跳过）、`Result`（动作 + 结果 + 观察到的网络调用 + `observed` / `inferred` / `blocked` 标签）、`Notes`。跳过任何 ID 都必须在 `Result` 里写原因。
   - **每个非平凡状态变化**（modal 打开、drawer 展开、mode 切换、submit 后）前后各跑一次 [references/dom-distill.js](references/dom-distill.js)，再用 [references/state-diff.js](references/state-diff.js) 比对：`node references/state-diff.js before.md after.md`。diff 输出填进 `Result` 列——取代散文描述，让"发生了什么"变成机械结果。
   - 打开每一个 menu / submenu：kebab / ellipsis、action dropdown、filter、sort、bulk action、move / folder picker、download submenu、remix / edit follow-up menu。
   - 验证 popover 机制：点击空白关闭、Esc / close 行为（如存在）、disabled menu item、危险操作项、嵌套 submenu 位置、viewport 裁切、移动端位置。
   - icon-only 与看起来装饰性的控件都按"有功能"处理直到反证。save / clear / copy / expand / randomize / regenerate / share / more — 一个一个 probe。
   - 每条交互还要记：validation、disabled、loading、optimistic update、error、success 输出、submit 后动作、auth / permission 重定向、paywall / quota、移动端 sticky。
   - 有列表时必须 probe 选择与批量行为：row checkbox 位置、select-all、selected-count actions、bulk move / download / delete，以及 selection 如何与 filter / pagination 交互。
   - 全局控件要与 row 控件分开 probe：全局播放器、persistent action bar、sidebar、底部 CTA、floating helper、fixed footer 往往有独立状态，不能遮挡主 CTA、列表内容、分页或移动端底栏。
   - 动态页面在每次重大状态变化（mode 切换、modal 打开、submit 后）后重跑枚举脚本。重跑前设置 `window.__websiteReplicationInventoryOptions = { startIndex: <下一个未使用的数字 ID> }`，避免追加行复用旧 ID；新行用 `<!-- After <state change> -->` 分隔追加。

5. **探测隐藏状态**

   每个主页面跑一遍下列 9 类。真不适用的标 `not applicable`。**跳过此步是 parity gap 的第一大来源**。

   - **Hover / focus**：tab 走一遍所有可聚焦元素，hover 所有交互元素；捕获 tooltip、popover、二级动作、helper text。
   - **键盘快捷键**：至少试 `?`（帮助层）、`/`（搜索聚焦）、`ctrl/cmd+k`（命令面板）、`esc`（关 modal/drawer）、`enter`（提交）、方向键（列表导航）、tab 顺序与陷阱、undo / redo。
   - **右键 / 长按**：主内容区、列表项、富内容表面都试一遍，看是否有自定义 context menu。
   - **拖拽 / 重排**：试列表项、文件、卡片的重排；记录 reorder API 和跨容器移动。
   - **滚动触发**：滚到底（infinite scroll / lazy load / sticky CTA / "回到顶部"）；嵌套容器内滚动；移动端底栏出现规律。
   - **输入边界**：空提交 · 最大长度 · 粘贴富文本 · 粘贴非法字符 · 输入法组合态 · disabled 态尝试操作。
   - **网络状态**：DevTools 限速到 slow 3G 看 skeleton / spinner；切 offline 看错误 UX；强制返回 5xx（"Network → Block" + replay）看恢复 affordance。
   - **URL / 历史**：直接 deep-link 进某状态 · 在多个 mode 间 back / forward · 流程进行中 refresh · 列表项右键新标签。
   - **多窗口 / 跨标签**：购物车、草稿、通知等共享状态，开第二个标签看同步方向。

6. **审计 API 与后端能力**
   - 抓观察到的网络调用：method、route pattern、headers / auth class、脱敏 payload 形状、response 形状、status code、error class。
   - 把请求列表喂给 [references/network-cluster.js](references/network-cluster.js)：`node references/network-cluster.js requests.txt`。脚本按 `host + path-pattern + method` 聚类、自动泛化 ID / UUID / token、识别 RPC-batched 端点（`rpcids` 子键）、长轮询 / 实时通道 / 遥测主机。输出当 *Observed endpoints* 表初稿用，再人工校对每行。
   - 读官方 / API / 集成文档。分清 `observed` / `documented` / `inferred`。
   - 把竞品 UI 字段映射到目标后端字段。**不主动重设计目标 API 契约**，除非用户明示。
   - 列出缺失：endpoint、第三方集成、auth / 权限、文件上传 / 存储、后台任务、异步完成（polling / webhook）、计费 / 配额、限流、持久化 / 历史。
   - 将每种状态归类为 local-only、session-only、account-persistent、workspace / project-persistent、shared / collaborative。folder、collection、item move assignment、reaction、favorite、hidden / archived、saved filter、history 通常需要后端持久化，除非明确只做本地态。
   - 只要涉及持久化，就要列 migration / schema、ownership check、RLS / permission policy、read API、mutation API、hydration strategy、fallback behavior、rollback path。刷新、重启服务、换 origin / port、第二台设备后丢失的状态，不能叫已复刻。
   - 检查 SSR / hydration 风险：可见 count、选中的 folder / workspace、filter、timestamp、random value、locale formatting、环境分支都不能导致 server HTML 和 client HTML 不一致。需要从服务端 seed、gate client-only render，或渲染稳定占位。
   - **不要因 API 或集成缺失就砍产品功能**。标 gap、查文档、提出需要的后端 / API 准备。

7. **建模数据与架构**
   - 按竞品域草拟核心实体。按产品类型调整：SaaS、电商、内容、协作、AI 工具、marketplace、内部工具。
   - 数据或异步任务重要时，输出 ER 与状态机图。
   - 架构推荐只在 API + 数据需求明确后给：前端框架、服务器 / API 层、队列、数据库、对象存储、缓存、auth、计费、第三方集成、可观测性。
   - list / workspace / collection 体验要显式建模容器和成员关系：folder / workspace / collection、item assignment、item feedback、filter、sort order、pagination、archived / deleted、history retrieval。

8. **反思并核对覆盖率**（强制 gate，在 step 9 前）
   - 对每份 per-page inventory 跑 [references/coverage.js](references/coverage.js)：`node references/coverage.js audit/<site>/snapshots/<date>/<page>-inventory.md [--threshold=90]`。脚本解析 `Probed` 列、统计 `✓` / `o` / `✗`、算覆盖率，**覆盖率 < 阈值且有 ✗ 行没写 `blocked` 理由时退出码 ≠ 0**。这是正式 gate，不靠 agent 自报数字。
   - 脚本退出码 ≠ 0 时，按它列出的 ID 回 step 4 补，不许进 step 9。
   - 显式问自己：*"鉴于这个产品类型，我最可能漏掉的三件事是什么？"* 写下三个候选 — 常见盲点：submit 成功后状态、错误恢复路径、设置 / 偏好、history / undo、分享 / 导出、移动端专属 affordance、付费层暗示在免费层的可见线索 — 然后 probe 每一个，记录结果。
   - 对照最终态的 DOM 复核 inventory。交互打开的新元素（modal 内容、drawer 内容、展开面板）必须枚举并 probe。
   - 复核 region model：每个主要区域都有 purpose、owned/consumed state、emitted events、Region Layout Constraints，并至少有一个 relationship 或明确的 `not applicable` 理由。
   - 把结果写进交付物的 *Interaction Coverage* 与 *Region Model Coverage* 段。**只有走完这一轮才能进 step 9**。

9. **产出 PRD 并做实施规划**
   - implementation-ready 工作必须用 [references/prd-template.md](references/prd-template.md) 写 Replication PRD。PRD 是开发交接物；audit report 是证据。
   - 把 region model 转成 region contracts：visible conditions、layout constraints、state ownership、consumed state、emitted events、update targets、UI requirements、behavior requirements、acceptance criteria。
   - 把跨区域依赖转成带稳定 ID 的 interaction contracts（`C1`, `C2`...）。每个 contract 必须写 trigger region、trigger event、target region、state change、API/data dependency、acceptance。
   - 把审计结果整成 parity matrix：竞品行为、目标实现、API 映射、就绪度、风险、验收标准。
   - 按用户工作流影响优先级排序：主路径 → 结果 / submit 后行为 → history → 二级页面 → SEO / 支持页。
   - 拆"现在就能实施"与"需要 API / 集成 / 数据准备"两堆。**不要**把被阻塞的后端工作呈现为 ready。
   - 验证遵守目标仓库现有惯例（CLAUDE.md / 测试框架）。新交互行为合并前至少补 happy-path 测试 + payload 契约测试。
   - 验证手段：build / typecheck / lint、截图、DOM overflow / 响应式检查、API 契约检查、持久化检查、hydration 检查，以及至少一个覆盖原始 parity miss 的状态转换测试。

## 常见漏检（Common Misses）

- 猜测而非观察的行为：任何交互 / 鉴权后的功能，没驱动登录态源站亲手触发就实现了——Share、收藏、受限下载、「More」级联。见 *保真：行为优先 + 双向*。
- 幽灵功能：加了源站根本没有的控件 / 功能（复刻的反面）。只建存在的。
- 内容深度不足：级联 / 菜单 / 列表只复刻了代表性样本，而不是每一级的每一项。
- 复刻品里的死 stub：看着复刻了的 tab / 菜单项 / 开关，却没接线没后端——要么照源站接上，要么不放。
- icon-only 按钮无行为：clear、save、randomize、expand、copy、download、regenerate、share、more。
- 菜单看起来像但产品逻辑没建模：ellipsis actions、nested downloads、remix / edit follow-up、move-to dialog、sort menu、filter menu、bulk menu、disabled destructive action、点击空白关闭。
- 状态相关的控件集合：toolbar / header 在不同字段状态下显示的控件**集合**会变——空字段可能只有一个动作（如 randomize），有内容时才露出更多（clear、save）。要在**空态和有内容态都做控件清单**；只复刻一种，就会做出源站按状态显隐的常驻按钮。
- 同一动作用同一 icon，且 icon 靠观察不靠猜：同一个动作从两处入口触发（如同一个「已保存项」选择器从两个 toolbar 打开）必须用同一个 icon；含义不明的图标要在源站亲手触发才知道它打开什么，绝不按形状臆测。同一目的地用了不同图标、或猜的隐喻，都像没做完。
- 菜单项的「外观细节」不只是文字：下拉不止是项文字——每项的前置 icon、已应用 / 激活态高亮（文档里已存在的选项用强调色显示）、字号（下拉别用过大字体）、行高都要复刻。项列表对了但每项外观或字号不对，照样像没对齐。
- 弹窗的响应式形态：同一个 overlay 常常桌面是居中对话框、移动端是底部抽屉（bottom-sheet）——两种都要抓、都要做。手机上还用桌面那套居中弹窗就是 parity miss。
- 诚实的「部分复刻」：复刻的部件里有一块你没有真实数据支撑（如源站的选择器有三个 tab，你的产品只有两个 tab 的数据），那就只做有数据的子集、**删掉**其余——绝不放一个永远为空、暗示有该能力的 tab / 区块。这是死 stub 规则在「部件局部」上的形态：缺数据的那块直接删，别做空壳。
- 隐藏状态变化：tab 选中、mode 切换、advanced 开关、上传 / 已选源状态、draft / restore。
- 流程推进后的区域替换：有真实内容后 examples / showcase 可能消失，result panel 可能切成 task list、history、folder、queue 或 workspace。
- 用户反馈：字数计数、已保存 / 已恢复提示、disabled 原因、validation 文案、空态、loading / progress、错误恢复。
- 结果 / submit 后：下载、保存到库、编辑 / 续写、分享、metadata、相关项、来源标注。
- 布局归属错：右侧面板用页面滚动而不是内部滚动、sidebar 没有独立吸底账号 / 升级区、全局播放器遮挡主 CTA、sticky footer 跨列不齐、面板过早堆叠、列表撑高页面。
- row 状态不一致：pending、completed、failed、selected、active-playing 行的信息架构应一致，除非参考站明确分离。
- list 语义漏掉：select-all、row checkbox 位置、selected-count menu、pagination、filter summary、reset control、sort icon / direction。
- 持久化边界错：folder、moved item、like / dislike、saved filter、history、user preference 应该是 account / workspace 数据，却只做成 local-only。
- Hydration mismatch：client-only localStorage、random、date、locale formatting、环境分支导致 server render 与 client render 的 count / label 不一致。
- 后端不匹配：UI 字段没送、送了的字段无文档、不可用 API 的伪 enabled 按钮、缺 auth / 配额 / polling / webhook、缺 migration / RLS / ownership check。
- 移动端细节：sticky CTA、底栏、无横向溢出、工具栏自然换行、文字塞进控件、点击目标尺寸。
- 布局约束漏检：sticky / fixed / docked 区域、独立滚动容器、overlay 是否占位、z-layer 与 backdrop、safe-area inset、键盘避让、与底栏 / FAB / toast / cookie bar 的碰撞规则。
- Hover-only 浮出、键盘快捷键（`?` / `/` / `ctrl+k`）、右键菜单、拖拽重排 —— 不跑 step 4 就看不见。
- 网络失败 UX、offline 态、慢网 skeleton —— 不限速看不见。
- URL / 历史行为：deep-link、流程中 refresh、多 mode 间 back / forward —— 不导航就看不见。
- 区域关系漏建模：左侧输入区和右侧结果区分别写了，但没有 state / event contract；history / selection 面板没有映射回 editor / form / result 区域。
- PRD 漏交付：只有 audit findings，没有可实现需求、验收标准、区域 contracts、响应式规则或可测试的跨区域交互。

## Configuration（默认值与覆盖时机）

默认值适合大多数场景。用户在请求里覆盖任意一项时，agent 在 step 1 之前读取并在报告里写明最终值。

| 旋钮 | 默认 | 何时覆盖 |
| --- | --- | --- |
| Cache window | 30 天 | 快速迭代 SPA / 周级发布产品降到 7 天；稳定企业工具升到 90 天。`--fresh` 关闭本次复用。 |
| Coverage threshold | 90% | 高风险审计提到 100%。低于 90% 仅当未 probe 元素都有 `blocked` 理由列在 gap list。 |
| Evidence 目录 | `./audit/<site-slug>/` | 用户给路径就用用户的。 |
| 差异化方向 | （必须明示或假设） | `workflow parity with original style` / `same features with target design system` / `research only`。 |
| Viewport 集 | `desktop-1440`, `mobile-iphone14` | 产品面向 tablet / 大桌面 / 特定设备时增加。 |
| 反思轮候选数 | 3 个 | 不熟悉的产品品类提到 5+。 |
| PRD required | implementation-ready audit 默认为 true | research-only 或 quick audit 才能关闭。 |

## Troubleshooting（常见问题）

| 现象 | 可能原因 | 行动 |
| --- | --- | --- |
| 没有浏览器 MCP，只剩静态 fetch | 无法观察交互 | 继续，但所有交互标 `inferred`，Coverage = 0% 写明原因"no browser automation"，并向用户提示结果只是 research。 |
| `dom-enumeration.js` 在非平凡页面上返回 < 5 个元素 | SPA 渲染进 shadow DOM 或 iframe | 脚本会穿透 open shadow root；跨域 iframe 设计上不可达。同域 iframe 在其 context 里重跑；closed shadow root 不可达，标 `inferred`。 |
| 命中缓存但活页面明显与旧截图不同 | 站点在 cache window 内改版了 | 该行强制 fresh；更新 `Last Captured`，MANIFEST 加备注"redesigned since <旧日期>"。 |
| 网络面板对明显的远程动作没抓到请求 | 走 WebSocket / SSE / `navigator.sendBeacon` | DevTools 过滤切"All"不要"Fetch/XHR"；抓 WS frame；标 `observed (via WS)` 或 `observed (via beacon)`。 |
| 需要登录态但没凭证 | 付费 / SSO / 私域 | parity matrix 标 `blocked`；不要绕 auth。用公开文档填 `documented` 行。 |
| 第一次跑没有 `MANIFEST.md` | 正常，新站点 | 用 [references/manifest-template.md](references/manifest-template.md) 的表头新建，边截边追加。 |
| 覆盖率低于 90% 且无 `blocked` 理由 | step 4 被跳过或赶工 | 回 step 4 把空着的 ID 补完；交付物先别发。 |
| 反思轮（step 8）说不出具体漏什么 | Agent 在现有内容上饱和了 | 用 [references/parity-checklist.md](references/parity-checklist.md) 的"Hidden States And Coverage"段，挑前三个还没勾的项做。 |
| region model 只有"左区 / 右区"但无关系 | Agent 只标了布局，没有标职责 | 改写成职责：input/config、output/result、history/restore、gating/auth，并补 ownership、dependencies、events、updates。 |
| PRD 只是 gap list | 用了输出模板但没做 PRD handoff | 加载 [references/prd-template.md](references/prd-template.md)，把每个重要区域关系转成可测试需求。 |
| 截图意外把 PII 进 git | 审脱敏漏了 | `git rm --cached <路径>` 撤掉、脱敏、重新 commit。长期换成单行 `audit/`。 |

## Token Budget（避免 context 爆炸）

完整审计的所有 tool 输出共用 agent context。单次看着小，跨多页面 / 多 state 变化会累积。按影响排：

| 风险（高→低） | 现象 | 处理 |
| --- | --- | --- |
| 1. `evaluate` 返 raw `outerHTML` | 单次 200KB–5MB HTML | **禁止**——存盘 + 引路径，绝不进 context |
| 2. `get_page_text` / 长页 raw 文本 | docs / 条款 / changelog 50–200KB | 优先用浏览器 MCP a11y 快照，否则跑 [references/dom-distill.js](references/dom-distill.js) |
| 3. 巨型列表 inventory 膨胀 | 1000+ 交互元素（数据表、kanban） | `dom-enumeration.js` 默认 limit=500，必要时降到 200 或 scope 到具体 `rootSelector` |
| 4. 重枚举不 diff | 每次 state 变化全量重抓 | 设置 `window.__websiteReplicationInventoryOptions = { startIndex: <下一个未使用的数字 ID> }`，用 `<!-- After <state> -->` 分隔只追加**新行**，已记的不复述 |
| 5. 多页面 audit 汇总 | 把 10 份 inventory 全读回 context | 流式按页处理；只持有路径和计数，不持有内容 |

**硬规则**：单次 tool 输出 > 50KB 必须落盘 + 引路径，不许放进 context。

Skill 本身已强制的保护：

- `dom-enumeration.js`：limit=500 · `startIndex` 支持追加状态 inventory · 稳定 CSS-path fallback selector · label 60 字符截断 · 不返 outerHTML
- `dom-distill.js`：maxNodes=2000 · maxDepth=10 · 剔除 script/style/SVG · 折叠 wrapper div · 文本 60 字符截断 · 属性 80 字符截断
- 截图与 DOM dump 都是文件产物，交付物只引路径
