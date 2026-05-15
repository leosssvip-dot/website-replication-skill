# Website Replication（中文导读）

> 这份文件是 [SKILL.md](SKILL.md) 的人类阅读版镜像，覆盖 Workflow / Evidence Safety / Common Misses / Configuration / Troubleshooting 五段。**Agent 加载的是英文版 SKILL.md**，这里仅为使用方查阅方便。
> 英文版有任何变更时，本文件同步更新；若两版冲突，以英文版为准。

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
  audit/**/*.txt
  audit/**/*.log
  audit/**/*.csv
  audit/**/network/
  audit/**/dom/
  audit/**/reports/
  ```

  Commit 截图前必须肉眼审一遍 PII（用户名、邮箱、客户内容、内部 ID）。需要最严的隐私时，整段替换成一行 `audit/`。

## Workflow（八步）

1. **定义范围与证据**
   - 列出所有 in-scope 页面、路由、tab、mode、drawer、modal、submit 后状态。
   - **先读 `audit/<site-slug>/MANIFEST.md`**（格式：[references/manifest-template.md](references/manifest-template.md)）。对每个 URL × viewport × auth 组合查表：命中且 `Last Captured` 在 cache window（默认 30 天）内 → 复用旧 snapshot 与 DOM，evidence 行标 `observed (cached from <date>)`，不重截。未命中或过期 → 新截，写回 manifest。manifest 不存在就用模板头新建。
   - 只对未命中的 URL 截桌面 + 移动端截图。整页截图 + 关键组件特写。
   - 保存脱敏证据：截图、控件清单、网络调用、console errors、以及一份**结构化 DOM 快照**。DOM 快照三选一：(a) 浏览器 MCP 自带的 a11y 树工具（chrome-devtools-mcp 的 `take_snapshot` 等）首选；(b) 跑 [references/dom-distill.js](references/dom-distill.js) 产出 markdown 大纲，比原始 outerHTML 小 50-100×，框架噪声已剔除；(c) 实在不行才存 raw `outerHTML`，存盘后**不要再读回 context**。**禁止**直接 `evaluate` `document.documentElement.outerHTML` 进 agent context——这是 skill 警告的最大 token 黑洞。网络抓包**永远新抓，不复用**。
   - 动态页面要在交互后再观察，不能只看首帧。
   - 每个 claim 标 `observed` / `documented` / `inferred` / `blocked` / `not applicable`。复用证据仍是 `observed`（30 天窗口是可靠性预算）。

2. **抽取 UI 系统**
   - 文档化布局、网格、shell / 导航、密度、间距、圆角、边框、色彩、字体、媒体处理、阴影、动效。
   - 建组件清单：导航、卡片、tab、segmented control、输入框、上传、chip、工具栏、modal、drawer、结果项、history、gating UI。
   - 用**目标产品自己的 token 与文案**写 HTML/CSS 示例，仅演示结构模式（如 icon + label 的 flex 布局）。不要粘竞品 class 名、精确间距、文案。
   - UI 差异化是有意为之：保留交互逻辑与字段结构，改 branding / 文案 / 图像 / 视觉节奏。

3. **枚举并探测交互**
   - **先枚举，再点击**。在浏览器自动化里跑 [references/dom-enumeration.js](references/dom-enumeration.js)（DevTools 控制台 eval 或 browser-MCP 的 eval 接口）。markdown 输出保存为 `audit/<site-slug>/snapshots/<date>/<page-slug>-inventory.md`，格式见 [references/inventory-template.md](references/inventory-template.md)。脚本已处理选择器优先级、shadow DOM 穿透、`cursor:pointer` 探测，**不要自己重新发明枚举逻辑**。
   - 按 ID 逐行走 inventory。每行填 `Probed`（✓ / ✗）、`Result`（动作 + 结果 + 观察到的网络调用 + `observed`/`inferred`/`blocked` 标签）、`Notes`。跳过任何 ID 都必须在 `Result` 里写原因。
   - icon-only 与看起来装饰性的控件都按"有功能"处理直到反证。save / clear / copy / expand / randomize / regenerate / share / more — 一个一个 probe。
   - 每条交互还要记：validation、disabled、loading、optimistic update、error、success 输出、submit 后动作、auth / permission 重定向、paywall / quota、移动端 sticky。
   - 动态页面在每次重大状态变化（mode 切换、modal 打开、submit 后）后重跑枚举脚本，新行用 `<!-- After <state change> -->` 分隔追加。

4. **探测隐藏状态**

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

5. **审计 API 与后端能力**
   - 抓观察到的网络调用：method、route pattern、headers / auth class、脱敏 payload 形状、response 形状、status code、error class。
   - 读官方 / API / 集成文档。分清 `observed` / `documented` / `inferred`。
   - 把竞品 UI 字段映射到目标后端字段。**不主动重设计目标 API 契约**，除非用户明示。
   - 列出缺失：endpoint、第三方集成、auth / 权限、文件上传 / 存储、后台任务、异步完成（polling / webhook）、计费 / 配额、限流、持久化 / 历史。
   - **不要因 API 或集成缺失就砍产品功能**。标 gap、查文档、提出需要的后端 / API 准备。

6. **建模数据与架构**
   - 按竞品域草拟核心实体。按产品类型调整：SaaS、电商、内容、协作、AI 工具、marketplace、内部工具。
   - 数据或异步任务重要时，输出 ER 与状态机图。
   - 架构推荐只在 API + 数据需求明确后给：前端框架、服务器 / API 层、队列、数据库、对象存储、缓存、auth、计费、第三方集成、可观测性。

7. **反思并核对覆盖率**（强制 gate，在 step 8 前）
   - 计算覆盖率：`enumerated N · probed M · coverage M/N (X%)`。<90% 且无 `blocked` 原因 → 回 step 3 把漏的 probe 完再继续。
   - 显式问自己：*"鉴于这个产品类型，我最可能漏掉的三件事是什么？"* 写下三个候选 — 常见盲点：submit 成功后状态、错误恢复路径、设置 / 偏好、history / undo、分享 / 导出、移动端专属 affordance、付费层暗示在免费层的可见线索 — 然后 probe 每一个，记录结果。
   - 对照最终态的 DOM 复核 inventory。交互打开的新元素（modal 内容、drawer 内容、展开面板）必须枚举并 probe。
   - 把结果写进交付物的 *Interaction Coverage* 段。**只有走完这一轮才能进 step 8**。

8. **实施规划**
   - 把审计结果整成 parity matrix：竞品行为、目标实现、API 映射、就绪度、风险、验收标准。
   - 按用户工作流影响优先级排序：主路径 → 结果 / submit 后行为 → history → 二级页面 → SEO / 支持页。
   - 拆"现在就能实施"与"需要 API / 集成 / 数据准备"两堆。**不要**把被阻塞的后端工作呈现为 ready。
   - 验证遵守目标仓库现有惯例（CLAUDE.md / 测试框架）。新交互行为合并前至少补 happy-path 测试 + payload 契约测试。
   - 验证手段：build / typecheck / lint、截图、DOM overflow / 响应式检查、API 契约检查。

## 常见漏检（Common Misses）

- icon-only 按钮无行为：clear、save、randomize、expand、copy、download、regenerate、share、more。
- 隐藏状态变化：tab 选中、mode 切换、advanced 开关、上传 / 已选源状态、draft / restore。
- 用户反馈：字数计数、已保存 / 已恢复提示、disabled 原因、validation 文案、空态、loading / progress、错误恢复。
- 结果 / submit 后：下载、保存到库、编辑 / 续写、分享、metadata、相关项、来源标注。
- 后端不匹配：UI 字段没送、送了的字段无文档、不可用 API 的伪 enabled 按钮、缺 auth / 配额 / polling / webhook。
- 移动端细节：sticky CTA、底栏、无横向溢出、工具栏自然换行、文字塞进控件、点击目标尺寸。
- Hover-only 浮出、键盘快捷键（`?` / `/` / `ctrl+k`）、右键菜单、拖拽重排 —— 不跑 step 4 就看不见。
- 网络失败 UX、offline 态、慢网 skeleton —— 不限速看不见。
- URL / 历史行为：deep-link、流程中 refresh、多 mode 间 back / forward —— 不导航就看不见。

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

## Troubleshooting（常见问题）

| 现象 | 可能原因 | 行动 |
| --- | --- | --- |
| 没有浏览器 MCP，只剩静态 fetch | 无法观察交互 | 继续，但所有交互标 `inferred`，Coverage = 0% 写明原因"no browser automation"，并向用户提示结果只是 research。 |
| `dom-enumeration.js` 在非平凡页面上返回 < 5 个元素 | SPA 渲染进 shadow DOM 或 iframe | 脚本会穿透 open shadow root；跨域 iframe 设计上不可达。同域 iframe 在其 context 里重跑；closed shadow root 不可达，标 `inferred`。 |
| 命中缓存但活页面明显与旧截图不同 | 站点在 cache window 内改版了 | 该行强制 fresh；更新 `Last Captured`，MANIFEST 加备注"redesigned since <旧日期>"。 |
| 网络面板对明显的远程动作没抓到请求 | 走 WebSocket / SSE / `navigator.sendBeacon` | DevTools 过滤切"All"不要"Fetch/XHR"；抓 WS frame；标 `observed (via WS)` 或 `observed (via beacon)`。 |
| 需要登录态但没凭证 | 付费 / SSO / 私域 | parity matrix 标 `blocked`；不要绕 auth。用公开文档填 `documented` 行。 |
| 第一次跑没有 `MANIFEST.md` | 正常，新站点 | 用 [references/manifest-template.md](references/manifest-template.md) 的表头新建，边截边追加。 |
| 覆盖率低于 90% 且无 `blocked` 理由 | step 3 被跳过或赶工 | 回 step 3 把空着的 ID 补完；交付物先别发。 |
| 反思轮（step 7）说不出具体漏什么 | Agent 在现有内容上饱和了 | 用 [references/parity-checklist.md](references/parity-checklist.md) 的"Hidden States And Coverage"段，挑前三个还没勾的项做。 |
| 截图意外把 PII 进 git | 审脱敏漏了 | `git rm --cached <路径>` 撤掉、脱敏、重新 commit。长期换成单行 `audit/`。 |

## Token Budget（避免 context 爆炸）

完整审计的所有 tool 输出共用 agent context。单次看着小，跨多页面 / 多 state 变化会累积。按影响排：

| 风险（高→低） | 现象 | 处理 |
| --- | --- | --- |
| 1. `evaluate` 返 raw `outerHTML` | 单次 200KB–5MB HTML | **禁止**——存盘 + 引路径，绝不进 context |
| 2. `get_page_text` / 长页 raw 文本 | docs / 条款 / changelog 50–200KB | 优先用浏览器 MCP a11y 快照，否则跑 [references/dom-distill.js](references/dom-distill.js) |
| 3. 巨型列表 inventory 膨胀 | 1000+ 交互元素（数据表、kanban） | `dom-enumeration.js` 默认 limit=500，必要时降到 200 或 scope 到具体 `rootSelector` |
| 4. 重枚举不 diff | 每次 state 变化全量重抓 | 用 `<!-- After <state> -->` 分隔只追加**新行**，已记的不复述 |
| 5. 多页面 audit 汇总 | 把 10 份 inventory 全读回 context | 流式按页处理；只持有路径和计数，不持有内容 |

**硬规则**：单次 tool 输出 > 50KB 必须落盘 + 引路径，不许放进 context。

Skill 本身已强制的保护：

- `dom-enumeration.js`：limit=500 · label 60 字符截断 · 不返 outerHTML
- `dom-distill.js`：maxNodes=2000 · maxDepth=10 · 剔除 script/style/SVG · 折叠 wrapper div · 文本 60 字符截断 · 属性 80 字符截断
- 截图与 DOM dump 都是文件产物，交付物只引路径

