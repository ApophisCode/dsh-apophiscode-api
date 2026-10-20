# ApophisCode 安装与恢复

包名为 `dsh-apophiscode-api`，默认地址为 `https://www.apophis.uk`。
本插件通过 npm 分发，并在 GitHub Releases 提供对应安装包与说明。
可用版本以 [npm](https://www.npmjs.com/package/dsh-apophiscode-api) 与[发布列表](https://github.com/ApophisCode/dsh-apophiscode-api/releases)为准；源码开发也可安装本地构建产物。
安装前保留现有插件、凭据与会话。

磁盘文件更新和浏览器刷新后，运行中的 DSH 仍可能保留旧模块。
**本机 DSH `0.2.1-rc.2` / `web` profile 换包需要重启当前已安装版本、同 profile 的宿主进程。**
重启后必须核对实际模型目录和发送消息的结果。真实对话验收状态见
[验证记录](validation.md)，不能以安装成功代替。

## 构建产物与版本

- 本机当前运行目标：DSH `0.2.1-rc.2`，profile `web`，已有页面
  `http://127.0.0.1:3080/`。开发依赖固定为 `0.2.1-rc.2`，客户端/RPC 测试还覆盖
  `0.2.0-rc.2`。声明接受 `>=0.1.5-rc.1 <0.3.0-0` 不等于全范围现场验证。
- Node 要求 `^22.19.0 || >=24.0.0`；本机离线验证使用 Node `24.13.0`、pnpm `10.32.1`。
- 在完整源码目录运行：

  ```powershell
  pnpm install --frozen-lockfile
  pnpm run build
  pnpm run check
  ```

  最终产物为 `.artifacts/dsh-apophiscode-api-0.1.5.tgz`。`check` 包含全量测试、
  两个 bundle 的再生与打包；单独 pack 成功不能代替检查通过。
- tarball 含运行 bundle、图标、许可和本地文档；不含源码、测试、开发脚本或
  开发依赖。继续修改或运行验收脚本需要保留完整源码工作区。

## npm 精确版本安装

在 DSH **设置 → 插件 → 添加插件** 的“包名或地址”中填写
`dsh-apophiscode-api@0.1.5`。使用 CLI 时可执行
`dsh plugin --profile <实际 profile> add dsh-apophiscode-api@0.1.5`；
先确认所用 CLI 属于当前宿主版本。安装后按下文核对 profile、启用状态与实际运行版本。

GitHub Release 中的同版本 tgz 可按本地文件安装；它仍属于本地来源，不会变成 npm 来源。
切换本地来源到 npm 时由使用者在插件管理器中显式安装精确版本，保留原插件配置与凭据。

## 安装到现有 profile

1. 记录当前 profile、已安装插件和启用状态。在实际 profile 目录备份
   `package.json`、`pnpm-lock.yaml` 与实际使用的 `cordis.patch.yml` 等配置文件。
   备份限于安装会影响的清单与配置，不导出凭据记录或会话。
2. 在现有 DSH 中打开 **设置 → 插件 → 添加插件**，在 **包名或地址** 中填写
   `dsh-apophiscode-api@0.1.5` 并安装。使用 Release 文件或源码构建包时，改填对应
   tarball 的本机绝对路径，例如 `C:\Downloads\dsh-apophiscode-api-0.1.5.tgz`。
3. 确认插件已启用，在 **设置 → ApophisCode → 插件版本** 核对运行版本。
   若仍显示旧版本、提示待重启或看不到设置入口，退出并重新打开当前同版本、同 profile 的
   DSH，再次核对。不要把启用状态、磁盘 hash 或浏览器刷新当成新模块已生效。
   源码修改不操作宿主生命周期；实际安装与重启按使用者的现场授权执行。
4. 检查插件列表中的 **ApophisCode** 名称和用户提供的图标，再打开
   **设置 → ApophisCode**。由使用者自行录入 Apophis API Key；不要贴到聊天或日志。
5. 将模型选择器的 **ApophisCode** 分组与当前 active Key 的 `/v1/models` 原始列表
   比对：ID、顺序、数量、展示名应一致，展示名直接等于 ID；手动隐藏的项目除外。
   无启用 Key 时目录为空；读取失败明确报错，不回退静态目录。其他插件的安装、
   凭据和会话应保留，不能自动迁移到新插件。

如果使用 CLI，命令为 `dsh plugin --profile <实际 profile> add <tarball 绝对路径>`。
如果 `dsh` 不在 PATH，可使用自己已安装版本的实际 CLI 入口；先核对路径和版本：

```powershell
$dshEntry = '<已安装 DSH 的 node_modules 绝对路径>\@deepseek-ai\dsh\lib\bin.js'
Test-Path -LiteralPath $dshEntry
node $dshEntry plugin --profile '<实际 profile>' add '<tarball 绝对路径>'
```

CLI 安装只更新 profile 的包与配置，不触发运行中 PluginManager 的 reload。
因此 CLI 命令退出成功不能证明当前页面已加载插件。不要为取得 CLI 而额外运行
`npx ...@latest`，以免无意切换宿主版本。开发安装可用
`dsh plugin --profile <实际 profile> add link:/absolute/path/to/dsh-apophiscode-api`；避免 `file:`
或复制带 `node_modules` 的源码目录到 profile，以免遮蔽宿主依赖。

## 地址、工具与现场验证

默认无需改域名。高级 `apiHost` 绑定主对话与模型目录；`statusHost` 控制附属读取。
DSH 0.2 的这些地址项在插件设置页只读，由 profile 配置提供。主路由支持网关根地址、
末尾 `/v1` 或 `/v1beta` 和自定义前缀，按协议只拼接一次版本路径。

Claude `auto` 固定 HTTP。只有明确选择 CLI 才使用隔离的 Claude Code 传输；CLI
自己的工具禁用，由 DSH 负责工具、权限、计划和历史。Google 原生传输使用包内锁定
SDK 和局部补丁以阻断重定向、保留 SSE 错误原因，验证范围见 [验证记录](validation.md)。

安装并由使用者配置凭据后，按验证记录逐模型检查普通对话、中文流式、连续上下文、
取消恢复与工具后续回答。真正发送模型请求会使用 API 额度，需要另行安排现场验证。
源码工作区的通用工具脚本可在该阶段复用；它不替代运行中 DSH 的界面验证。

## 更新与恢复

npm 来源可在 **设置 → ApophisCode → 插件版本** 检查并更新至官方 npm 的 latest。
尚无 latest 时明确提示尚未公开；网络失败明确报错。更新前重新获取版本，只安装比运行版和落盘版都新的精确版本，遵守 profile 的发布冷却期，不覆盖本地文件或开发链接。
安装成功只代表落盘核对通过；重启同版本、同 profile 的 DSH 后再核对运行版本。
本地源码修改后重新执行完整检查，保留旧 tgz，再显式安装新的本地产物。
本机同版本重新安装也需要重启宿主，之后重新核对模型目录。

若需要恢复，先通过 **设置 → 插件** 停用并移除 `dsh-apophiscode-api`，确认只选择
新插件；若使用 CLI，则是 `dsh plugin --profile web remove dsh-apophiscode-api`，
它同样不能证明运行中实例已卸载。记录宿主是否要求重启，按实际状态安排。
核对 profile 清单、锁文件与 bundle 配置；保留其他插件、base 和 web-app。

若安装失败，先读取安装器错误并检查自动回滚结果。只有确认没有其他并行配置变更时，
才用安装前备份恢复受影响的清单/锁文件/配置并让当前版本的 profile 包管理器重新对齐；
不要把过期备份覆盖后来新增的配置。恢复不删除任何凭据记录、会话目录或整个 profile。
如需撤回，按上述方式只移除本插件，保留凭据、会话及其他插件。
源码及配置备份留在本地忽略目录，不随公开仓库上传。
