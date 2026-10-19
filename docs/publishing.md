# ApophisCode 发行指南

发行身份固定为 `dsh-apophiscode-api`、官方 npm registry 与
`ApophisCode/dsh-apophiscode-api` 仓库。
普通 main CI 只验证代码；每个版本由维护者明确选择版本和操作后手动发行。
本指南描述流程，不代表对应版本已经公开。实际状态与证据见[验证记录](validation.md)。

## 版本与产物

1. 在完整源码仓库修改 `package.json` 的稳定版号，写入
   `docs/release-notes/v<version>.md` 和 `CHANGELOG.md`，同步安装文档与验证范围。
2. 使用 Node `24.13.0`、pnpm `10.32.1` 执行：

   ```powershell
   pnpm install --frozen-lockfile
   pnpm run build
   pnpm run check
   node scripts/release-preflight.mjs 0.1.4
   ```

3. 审查 `.artifacts/release/0.1.4/` 的 tgz、`SHA256SUMS`、`notes.md` 和
   `title.txt`。核对包名、版本、运行文件、文档、许可及无凭据。记录 tarball 哈希。
4. 源码与生成的 `lib/` 在同一提交中准备好。只有取得本次 push 授权后才推送；
   npm 发布、tag 和 GitHub Release 也分别需要明确授权。

`Release` workflow 只接受 main 的手动 dispatch，`version` 必须与 manifest 一致。
`mode=prepare` 是默认值：执行 frozen install、完整 check、bundle 一致性、发行身份
与说明校验、已有 tag 检查，仅上传 `release-<version>` artifact，不公开发布。
CI 中的 tgz 作为之后 npm 与 GitHub Release 共用的发行物。下载 artifact 后先核对
SHA-256；PowerShell 可用 `Get-FileHash -Algorithm SHA256 <tgz路径>`。

## 首次公开发布

npm 包尚不存在时，先由用户长期控制的账号交互登录与完成 2FA。
在账号与包名资格确认、npm 发布授权到位后，从 `prepare` artifact 使用同一份 tgz：

```powershell
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
npm publish '<prepare产物的绝对路径>\dsh-apophiscode-api-0.1.4.tgz' --access public --tag latest --registry=https://registry.npmjs.org/
```

账号须先启用 2FA；登录成功不代表已完成本次发布验证。npm 生成官方浏览器验证链接时，
由账号持有者打开链接并完成验证。不要在聊天、源码或 workflow 中提供密码、OTP、恢复码或
token。登录、2FA 配置和发布验证由用户交互完成。
发布前 `private: false` 只表示配置可发布，不证明账号有权限或版本已经存在。

取得 tag 与 Release 授权后，在 **同一 main 提交** 手动运行 `mode=release-existing`。
该模式重新验证产物，然后比对官方 npm 精确版本的包名、版本与 SHA-512 integrity，
一致后才创建 `v0.1.4` tag 和 GitHub Release，附上同一 tgz 和 SHA-256 校验和。
发布列表为[本仓库 Releases](https://github.com/ApophisCode/dsh-apophiscode-api/releases)。
首次 npm 发布和该步骤完成前不要移动 main；不同提交或不同打包内容会被完整性门禁拒绝。

## 后续版本使用 OIDC

包存在后，由包持有者在 npm Trusted Publisher 中配置 GitHub Actions：

| 字段 | 值 |
| --- | --- |
| Owner | `ApophisCode` |
| Repository | `dsh-apophiscode-api` |
| Workflow filename | `publish.yml` |
| Environment | 留空，与当前 workflow 一致 |

在即将执行下一次公开发行时配置并验证，遵守 npm 当时的有效期要求。
npm 的 `npm trust` 前提是包已存在；OIDC 需要 GitHub-hosted runner、
Node ≥22.14.0、npm ≥11.5.1 和 `id-token: write`。本 workflow 固定 Node `24.13.0`、
npm `11.21.0`，只给 publish job OIDC 权限，不保存长期 npm token。
官方配置与前提见 [Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
和 [npm trust](https://docs.npmjs.com/cli/v11/commands/npm-trust/)。

下一版本准备并获得公开动作授权后，手动选择 `mode=publish`：准备并上传发行物，
OIDC 发布同一 tgz 到 npm latest，随后核实 npm integrity，再创建对应 tag 与 Release。
`mode=release-existing` 可在 npm 已成功而 Release 尚未创建时补做后半段，不重复 npm 发布。

维护 Trusted Publisher 时以服务端实际返回的权限与来源配置为准；当前 workflow
仅调用正式 publish。公开状态和产物核对结果见[验证记录](validation.md)。

## 失败与恢复

- npm 失败：保留 workflow 日志和 artifact，查明认证、版本占用或服务错误；不创建 Release。
- npm 已成功而 Release 失败：记录真实状态，保留原 artifact 和对应提交，检查 tag/Release
  是否已部分创建。同一提交且 tag 不存在时可用 `release-existing` 补做。
- npm 命令成功后，精确版本可能暂时 404，latest 也可能仍为旧版。先等待公开元数据可读并
  核对实际包完整性，再补做 Release；不能因这个延迟重复发布同版本。
- 已有 tag 时 workflow 拒绝覆盖。人工核对 tag 指向的 commit、npm integrity 和已有资产，
  取得相应授权后恢复；不要移动 tag、重传不同 tgz 或把另一次构建当成原产物。
- main 已移动或重建 tgz 不同：自动门禁会拒绝；保留最初 artifact 和原 commit，
  使用它们核实 npm 后安排人工恢复。不要为通过门禁而改校验值。
- npm 的同版本包不可覆盖。发现代码问题使用新的前向修复版本；不要把撤销公开版本
  当成本地回滚。用户安装恢复见[安装说明](local-installation.md)。

## 线上验收出口

分别记录 npm 精确版本存在、latest 指向、npm integrity 与 artifact 一致、Release
tag/说明/资产一致。在用户确认的隔离 profile 中用 `包名@版本` 真实安装，核对落盘版；
重启同版本、同 profile 的 DSH 后核对运行版、设置入口与一次实际模型交互。
只有一个公开版本时不能声称真实跨版本升级已经通过。现有用户 DSH 的安装与生命周期
操作仍须对应授权，源码实现不包含这些动作。
