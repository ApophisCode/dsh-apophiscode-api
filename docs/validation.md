# ApophisCode 验证记录

日期：2026-10-20。离线 fixture、真实网关调用和运行中 DSH 交互分别记录。
本页描述当前实现的证据与限制；本地开发过程和逐次检查日志保存在忽略目录。

## 0.1.6 修复：点击更新后安装器启动失败

2026-10-20 新增排障，与下方已公开 0.1.5 的历史证据分开记录。

- 用户反馈：0.1.4 能检查出 0.1.5，点击更新后等待数秒报通用失败。只读检查
  `web` profile 的落盘版仍为 0.1.4；运行宿主为 Node 直接启动 DSH `bin.js`，
  参数没有桌面版的 bundled pnpm。未读取用户凭据或调用更新端点。
- 修复前，在独立临时 profile 经真实 RPC、默认进程启动器复现两次：
  能发现新版本，更新却返回 `ApophisCode plugin update failed`，落盘不变。
  裸 `spawn('pnpm', ['--version'])` 在本机返回 `ENOENT`。旧检查使用命令 stub，
  没有覆盖 Windows 进程启动；[Node 官方文档](https://nodejs.org/api/child_process.html#spawning-bat-and-cmd-files-on-windows)
  说明 `.cmd` 不能作为普通可执行文件直接启动。
- pnpm 定位与启动职责移至 `src/plugin-pnpm.js`。优先保留宿主自带 pnpm，
  再寻找系统安装；Windows 的 npm/Corepack shim 解析到实际 JS/EXE，JS 用宿主
  Node 直接运行。POSIX 支持可执行程序、脚本及其符号链接，短 PATH 也补齐宿主
  Node 目录。全程不拼接 shell 命令，不更改 profile 的发布冷却期。
- 修复后的同一反馈循环通过；另用同一解析器只读启动本机实际 pnpm，
  `--version` 成功返回 `10.32.1`。该检查不安装插件。
- 新增默认子进程 → pnpm fixture → RPC 的 **11/11** 检查：PATH、宿主自带与
  runtime pnpm、PNPM_HOME、Corepack、含空格和 `&` 的路径、冷却期、网络失败、
  超时、零退出却没有安装、同实例重试恢复，以及 Windows 损坏 shim。
  POSIX 原生 CI 使用等价的脚本符号链接检查代替 Windows 专项。
- 新增 **8/8** 构建后设置页检查，显示固定中英文失败原因并保留可用重试按钮；
  未知错误、原始输出与路径不会进入提示。落盘成功和待重新加载仍分开显示。
- 本机 Windows、Node `24.13.0`、pnpm `10.32.1` 的完整检查 **605/605** 通过，
  零失败、零跳过，完成两端构建与本地打包。
- [三系统原生 CI](https://github.com/ApophisCode/dsh-apophiscode-api/actions/runs/39359303808)
  在提交 `0142ce69b17c424c2d16e032e8eea9bd5efb3383`、Node `22.20.0` 上通过：
  Windows、Linux、macOS 更新进程各 **11/11**，Ubuntu 全量 **605/605**，
  零失败、零跳过，重新构建的 `lib/` 与提交一致。
  首次 macOS 检查的 fixture 将 `/var` 与 `/private/var` 路径字符串直接比较而失败；
  改为严格比较同一物理 profile 的 realpath 后三系统通过，生产代码没有为此增加特判。

复现与回归命令：

```powershell
node --test tests/plugin-update-process.test.mjs
node --test tests/plugin-version.test.mjs tests/client-version-update.test.mjs
pnpm run check
```

修复前第一条命令失败，实际为 `{ ok: false, error: { message: 'ApophisCode plugin update failed', ... } }`；
修复后为 11/11 通过，成功用例核对落盘 0.1.5、运行快照 0.1.4 与待重启状态。
fixture 的版本号只是离线输入，不代表更新已经安装到用户 DSH。

当前修复为 **0.1.6**，本节为发布前验证；公开状态见下节发布后核对记录。
未安装到用户 DSH，也未操作其启动、停止或重启。真实跨版本在线安装及 Linux/macOS
完整 DSH 交互仍待验收。旧版的更新器不会因远端发布新包而自动替换自身；首次获取本修复
需要由使用者通过宿主插件管理器安装 `dsh-apophiscode-api@0.1.6`，之后再验证插件内按钮路径。
README 中既定的检查更新、点击更新、重新打开 DSH 的流程保持适用，无需新增终端步骤；
本次已同步变更记录、安装文档与本节证据。

## 0.1.6 公开发行验证

- 2026-10-20 发布后，[npm 精确版本](https://www.npmjs.com/package/dsh-apophiscode-api/v/0.1.6)、
  registry 的精确版本、`latest` 与完整元数据均核对为 **0.1.6**；默认公开 tarball
  下载成功。[GitHub v0.1.6 Release](https://github.com/ApophisCode/dsh-apophiscode-api/releases/tag/v0.1.6)
  是最新正式发行，tag 指向固定源码提交 `2a4aa6cad33ef828cf57f519deb6d7320c8a05ad`。
- 最终提交的[普通 CI](https://github.com/ApophisCode/dsh-apophiscode-api/actions/runs/39359733708)
  三系统更新进程各 **11/11**、Ubuntu 全量 **605/605**，bundle 再生一致。
  [准备任务](https://github.com/ApophisCode/dsh-apophiscode-api/actions/runs/39359756549)
  通过完整检查与 preflight；下载后的 54 个包内文件逐一对比固定提交的 git blob，
  仅 `package.json` 有 pnpm 正常省略 `packageManager` 的差异。
- [正式发布任务](https://github.com/ApophisCode/dsh-apophiscode-api/actions/runs/39359871725)
  的 prepare/publish 成功，经 GitHub Actions OIDC 上传同一 tgz。npm 公开元数据
  暂时 404，导致 Release 核对停止；精确版本和 integrity 可读后，保持源码提交不变，
  使用 [release-existing](https://github.com/ApophisCode/dsh-apophiscode-api/actions/runs/39360181649)
  成功补齐 tag/Release，publish job 正确跳过，没有重复 npm 发布。
- npm 下载入口还曾命中发布前的 300 秒负缓存。2026-10-20T02:44:18Z 最终核对时，
  默认下载已成功，npm、GitHub 附件及两次 CI artifact 的 tgz 逐字节一致：
  **54 文件、469238 字节**，SHA-256 为
  `d43d1b4aa9c9204be8b48cd9652a80234dd96ba3a7c4302d7360588c4e61d956`。
  Release 标题、说明、`SHA256SUMS` 和 npm 首页 README 与固定发行物相符。
- npm 公开 publish/provenance statements 中的包 SHA-512、仓库 ID `1425822020`、
  `.github/workflows/publish.yml`、main 来源提交和正式发布 run 均核对一致。

本节为发布后补录，未重新打包或覆盖公开的 0.1.6。
本次没有安装到用户 DSH，也未启动、停止或重启其宿主，未读取用户 Key 或调用模型。
公开分发与原生进程测试不代表真实 DSH 跨版本在线升级已经现场验收。

## 0.1.5 修复：切换 Key 后设置页模型列表未刷新

2026-10-20 新增回归，独立于下方 0.1.4 发行时的历史验证。

- 修复前，以构建后的设置页连接实际注册的插件 RPC 和真实 `LlmRuntime`，
  先加载 DeepSeek Key 的五个原始 ID，再点击 GPT Key 的「切到此 Key」。
  凭据 active 状态、`models/status` 与 DSH 宿主目录均已切换，设置页却仍保留
  五个 DeepSeek ID。复现测试连续两次失败，定位为卡片只在初次挂载时读取。
- Key 添加、选择、停用、启用、移除、全部移除及目标地址变更成功后，设置页
  重新加载模型卡片；账户的手动刷新在模型覆盖读取结束后也刷新卡片。
  上一目录的行、错误与延迟响应随卡片销毁，读取失败不能继续显示旧 Key 列表。
  余额后续读取失败不阻止已成功切换的模型刷新；Key 重命名不触发目录重载。
- 新增 `tests/client-model-selection.test.mjs` 的 **10/10** 个离线行为检查，
  覆盖切换及切回、原始响应顺序、带日期及未知元数据 ID、空凭据环、添加首个 Key、
  切换失败、禁用与重新启用、移除、强制刷新失败及恢复、目标切换、迟到的目录响应、
  余额失败和迟到的勾选保存响应；切回后仍保留之前隐藏的型号。
  凭据 fixture 按记录键保存，浏览器只收到公开 RPC 投影。
- 相关检查 **51/51** 通过。Node `24.13.0`、pnpm `10.32.1` 下
  `pnpm run check` **586/586** 通过，零失败、零跳过，完成两端构建和本地打包。
  既有图片设置测试的 React fixture 补齐 `useReducer`，图片行为保持通过。
- 本次恢复已有模型目录约定，不改变 RPC 契约、模型协议、Key 选路与默认配置；
  README 的既定使用步骤仍适用。变更记录与本节已同步。

复现与回归命令：

```powershell
node --test tests/client-model-selection.test.mjs
pnpm run check
```

本节全部使用明确的离线网关响应，不证明用户 GPT Key 的实际权限或真实调用成功。
0.1.5 已公开，分发状态与产物完整性见下节发布后记录。
本次没有安装到用户 DSH，没有读取用户 Key、调用真实网关，或操作现有 DSH 生命周期。

## 0.1.5 公开发行验证

- [npm 精确版本](https://www.npmjs.com/package/dsh-apophiscode-api/v/0.1.5)已公开，
  该次核对时 `latest` 指向 `0.1.5`；[GitHub v0.1.5 Release](https://github.com/ApophisCode/dsh-apophiscode-api/releases/tag/v0.1.5)
  作为当时最新正式发行公开。中英文安装示例已更新，npm 首页 README 与发行提交一致。
- 固定发行提交为 `1769e289a1f71b811ce7b30294d9498a3597d4b5`。
  [准备任务](https://github.com/ApophisCode/dsh-apophiscode-api/actions/runs/39355650839)
  完成 586/586 检查、构建一致性与 preflight；下载审查的全部包内文件与发行提交匹配，
  `package.json` 仅含 pnpm 打包时正常省略 `packageManager` 的差异。
- [正式发布任务](https://github.com/ApophisCode/dsh-apophiscode-api/actions/runs/39355799323)
  通过 GitHub Actions OIDC 上传同一份 tgz。npm 元数据尚未同步时，Release 阶段因精确版本
  返回 404 而停止。待精确版本、latest 与公开下载包核对通过后，在同一提交执行
  [release-existing](https://github.com/ApophisCode/dsh-apophiscode-api/actions/runs/39356198069)
  成功补齐 tag 和 Release，没有重复发布 npm。
- npm、Release 附件和准备/发布 CI artifact 的 tgz 逐字节一致：**53 个文件、463983 字节**，
  SHA-256 为 `af683b2b655d587e46b0fb404abc2ab87e5c5d4da3a8bf5cd38a45231c119055`。
  `SHA256SUMS`、Release 说明和 tag 目标均与固定发行物、发行提交对应。
- npm 公开 provenance 的包摘要、仓库 ID `1425822020`、workflow
  `.github/workflows/publish.yml`、main 来源提交和正式发布任务均核对一致。

本节为发布后补录；发行包对应上述固定提交，未重新打包或覆盖已公开版本。
公开分发验证不作为已在用户 DSH 安装、加载或完成真实 GPT 调用的证据。

## 0.1.4 发行范围

本插件使用独立的包名 `dsh-apophiscode-api`、provider `apophiscode`、
凭据与设置 scope `apophiscode-api`、RPC `/apophiscode-api`。
实现 helper、React 组件和本地宿主测试包均使用 ApophisCode 名称。
发行包仅包含当前运行文件、安装文档及完整许可，不包含本地参考材料或开发过程归档。

0.1.4 已在官方 npm 公开，发行验证时 `latest` 指向 0.1.4；对应 tag 与 GitHub Release 已完成。
本次没有安装、启动、停止或重启用户现有 DSH，没有读取用户 Key 或发送模型请求。

## 0.1.4 公开发行验证

- [npm 精确版本](https://www.npmjs.com/package/dsh-apophiscode-api/v/0.1.4)与
  [GitHub v0.1.4 Release](https://github.com/ApophisCode/dsh-apophiscode-api/releases/tag/v0.1.4)
  均已公开；中英文 README 随包发布，npm 首页 README 与发行源码一致。
- 发行提交为 `348c8b15be4c7fa7d22ee8ee8e888b06fa1290a0`。
  正式发布使用 GitHub Actions OIDC，公开 provenance 的仓库 ID、workflow、来源提交和
  SHA-512 均与当前仓库及发行包对应。
- npm、Release 附件和 CI artifact 的 tgz 逐字节一致：52 个文件、461699 字节，
  SHA-256 为 `40470bbfbc5c09ca66338db7df15f722d9b2fca3eae0adde115628ac671f6303`。
  公开包与发行提交的运行文件和完整许可一致。
- [发行任务](https://github.com/ApophisCode/dsh-apophiscode-api/actions/runs/39281940335)
  的第二次执行完成 npm 发布；随后 Release 步骤遇到 npm 元数据暂时 404。
  在公开包完整性核对通过后，仅用
  [release-existing](https://github.com/ApophisCode/dsh-apophiscode-api/actions/runs/39352701226)
  补齐 tag 与 Release，没有重复 npm 发布。

本节记录公开分发验证，不作为当前版本已在用户 DSH 安装、加载或完成真实调用的证据。

## 模型目录规则与验证口径

会话目录来自本插件当前 active Key 的 `GET /v1/models`。显示全部原始 ID，保持响应顺序，
展示名等于 ID；切换 Key 后替换对应目录，不合并启用 Key、不按公开广场或静态模板裁剪，
也不主动隐藏带日期或过期标记的 ID。使用者可手动隐藏型号，默认全选。

已声明的 DeepSeek 型号使用 `/v1/responses`，默认推理档位 high；`deepseek-v4-pro`
提供 high/max，已声明的 Flash 型号提供 off/low/high/max。请求保持精确 ID，不改写
别名或旧会话，失败不自动切换协议。未知元数据仍显示原 ID 与不可调用说明，不猜测
协议、容量或能力，也不使其他型号消失。已有元数据的精确型号续聊不依赖目录 GET 成功。

目录缓存十分钟。强制刷新模型覆盖、Key 变更和目标变更会使相关缓存失效；读取失败
明确报错。缓存和并发目录请求按 Key/目标隔离，响应中的凭据反射会被拒绝。
图片工具使用独立型号与图片 Key。公开[模型广场](https://www.apophis.uk/model-plaza)
提供渠道和价格说明，不代表当前 Key 权限或插件对全部型号的调用支持。

## 本地验证

- Node `24.13.0`、pnpm `10.32.1`；使用 `pnpm install --frozen-lockfile`。
- 完整检查通过 **576/576**，零失败、零跳过，完成宿主与客户端构建和打包。
- 遍历 259 个不同依赖包名/版本；外部依赖保持锁定。旧宿主兼容测试使用本仓库内
  `apophiscode-host-v020-fixture`，来源 `file:tests/fixtures/host-v020`。
- 测试通过真实插件注册 adapter、PiAiAdapter、ToolRuntime、BlockAssembler、Cordis
  和 HostConnection 验证协议、原始目录、工具闭环、取消、错误、凭据隔离及 RPC。
  客户端与宿主包覆盖 `0.2.0-rc.2`、`0.2.1-rc.2`；声明范围不是全范围现场验收。
- 按记录键存储的共享凭据服务验证其他 provider 的记录不被读写；真实 DSH registry
  验证另一 provider 的模型、已准备会话与设置 scope 保持独立。手动禁用 Key 保留记录、
  可重新启用，自动选择仅限本插件启用的 Key。
- 原始开发场景另在本地重跑 **79/79**，用于核对通用 fixture 整理未削弱隔离和错误处理。
- 解包后的实际入口通过 **6/6** 项传输边界检查。浏览器回放服务的页面、合成 PNG 与
  JavaScript 均可读取；HTTP 检查不能替代浏览器交互验收。
- LICENSE 与依赖许可正文保持完整。构建来源、版本和许可守卫不因发行整理而放宽。

复现命令：

```powershell
pnpm install --frozen-lockfile
pnpm run build
pnpm run check
```

## 传输与安全边界

- OpenAI HTTP 传输通过 per-request fetch 拒绝重定向。认证只来自本插件的凭据记录，
  不读取环境变量或外部 CLI 登录，失败不切换目标域名。
- Google 原生传输内联 pi-ai `1.1.0` 的 native Google 子入口、`@google/genai 2.21.0`
  及实际运行依赖。锁定局部补丁使 Fetch 拒绝重定向，并在 SDK 完成 SSE 组帧后保留
  错误状态与原因；不修改全局 fetch 或宿主 SDK。编码、签名和工具历史继续由 SDK 处理。
- `scripts/google-sdk-boundary.mjs` 检查精确版本、SDK 源码 hash、补丁、实际 bundle
  模块图和许可。来源变化或缺失时构建失败；升级构建器仍须保留确定性和行为检查。
- 两个 Gemini 型号的真实注册 adapter 在 loopback 双 server 上验证：307 目的端零请求，
  分块中文 SSE 保留状态、原因和部分回答，反射测试 Key 脱敏，不执行工具或隐式重发，
  下一轮可以恢复。旧宿主依赖夹具还覆盖原生工具闭环。这些都是离线证据。
- Claude `auto` 使用 HTTP。只有显式选择 CLI 才使用隔离配置及 MCP；CLI 自带工具禁用，
  DSH 负责工具、权限、计划与历史。策略拒绝直接返回，不隐式重放或切换传输。
- 余额读取直接 USD 和接口显式额度字段；公开分组与带 Key 的模型覆盖分开读取。
  搜索需要结构化结果，图片使用同步生成/编辑接口；未知或不支持的响应明确失败。
- 运行和客户端构建均关闭 pnpm 平台路径调试标签。CI 比较重新生成的 `lib/` 与提交文件。

许可与局部修改说明见 [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md)。

## 真实服务与 DSH 的验证边界

本地开发期间，模型目录、余额及公开分组曾取得真实成功响应，也曾发生连接超时。
这些记录不能证明所有接口持续可用，不能据此将网络失败归因为 Key 或某一 IP 协议。

真实 DSH 中，`deepseek-v4.1-flash` 与 `deepseek-v4-pro` 曾返回正常回答；前者还完成
一次 `pwsh/pwd` 工具执行、结果回传与后续回答，以及中文流式输出。
`deepseek-v4-flash` 曾返回 `404/model_not_found`，带日期型号曾返回 503，
`deepseek-flash` 的直接 Responses 对照曾返回 404。目录出现型号不代表真实调用已通过。

当前版本的 npm 安装、在线跨版本更新、其余型号真实调用、图片成功生成/编辑、搜索
以及显式 Claude CLI 在 Apophis 的兼容性仍未完成现场验收。既有开发版本的交互结果
不作为当前发行版已安装和加载的证据。

真实安装后需按 [安装说明](local-installation.md) 核对落盘版与运行版，在同版本、
同 profile 的 DSH 中分别验证普通对话、中文增量、多轮历史、取消恢复与工具后续回答。
现场模型调用会消耗 API 额度；源码和发行工作不包含这些操作。

完整源码的 `node scripts/tool-check.mjs --help` 不读取 Key。正式执行只读取
`apophiscode-api` scope 中的启用 Key，一次检查一个精确模型，不改写凭据或宿主状态。
实际覆盖和限制同时记录在 [compatibility.json](../compatibility.json)。
