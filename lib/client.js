window.__ModuleLoader__.load({
	id: "dsh-apophiscode-api",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		let react = require("react");
		react = __toESM(react, 1);
		let react_jsx_runtime = require("react/jsx-runtime");
		/**
		* The settings panel's copy, in both languages DSH ships.
		*
		* @module dsh-apophiscode-api/client-copy
		*/
		const zh = {
			nav: "ApophisCode",
			intro: "添加 API Key 后即可在 DSH 中使用 ApophisCode。在下方“显示的模型”中管理当前 Key 的模型。",
			accountsTitle: "账户与 Key",
			imagesTitle: "图片生成与编辑",
			imagesBalanceLoading: "正在读取图片 Key 余额…",
			imagesBalanceFailed: "图片余额读取失败",
			imagesComposerLabel: "图片剩余额度",
			imagesBalanceKey: "当前图片 Key",
			imagesBalanceHint: "这里只显示图片 Key 的余额，每分钟自动更新，也可手动刷新；对话 Key 的余额单独显示。",
			imagesIntro: "使用独立图片 Key 调用 ApophisCode 图片接口。生成新图或上传图片后描述修改要求；图片模型独立于对话模型。原始 PNG 保存在本机，聊天中显示图片预览。",
			imagesEnabled: "图片生成与编辑",
			imagesOn: "启用",
			imagesOff: "停用",
			imagesModel: "请求型号",
			imagesQuality: "请求质量",
			imagesQuality_auto: "自动",
			imagesQuality_low: "低",
			imagesQuality_medium: "中",
			imagesQuality_high: "高",
			imagesQuality_xhigh: "超高（xhigh）",
			imagesQuality_max: "最高（max）",
			imagesModelDefault: "使用当前图片 Key 返回的第一个型号",
			imagesQualityHint: "auto 使用服务端默认参数；额外质量选项仅显示接口声明的值。目录出现某个型号不代表它支持图片。失败不会换型号或降低质量。",
			imagesAddKey: "添加图片 Key",
			imagesKeyPlaceholder: "粘贴专用的图片 API Key",
			imagesNoKey: "尚未添加图片 Key。添加后可使用图片工具；对话 Key 不会用于图片请求。",
			imagesLoadFailed: "图片设置读取失败。若刚更新本地插件，请重新加载插件后再打开设置。",
			imagesUnavailable: "当前 Host 未提供图片附件服务，图片工具暂不可用。",
			imagesCreate: "创建图片",
			imagesShortcutHint: "在草稿中加入 ApophisCode 生图指令，再补充图片描述后发送。",
			imagesDraft: "请使用 apophiscode_image_generate 工具，跟随 ApophisCode 已保存的图片型号和质量。有参考图时编辑参考图，没有参考图时生成新图。图片要求：",
			imagesDraftBusy: "输入框正忙或已有引用，请直接在草稿里描述图片要求。",
			imagesGenerating: "正在生成…",
			imagesFailed: "生成失败",
			imagesDone: "已生成",
			imagesOpen: "打开图片",
			imagesRetryPreview: "预览加载失败，点击重试",
			imagesLoadingPreview: "正在加载图片…",
			imagesViewerTitle: "图片预览",
			imagesClosePreview: "关闭图片预览",
			imagesDownloadOriginal: "下载原图",
			imagesDownloadPreparing: "正在准备原图…",
			imagesDownloadFailed: "原图保存失败。请确认本机原图仍存在，然后点击“下载原图”重试。",
			refresh: "刷新",
			refreshing: "刷新中…",
			staleNote: "上次读取于 {time}，本次读取失败：{error}",
			balanceUnavailable: "余额暂时无法更新",
			balanceStale: "余额暂时无法更新，当前显示上次成功读取于 {time} 的余额。",
			balanceUnreadable: "余额接口返回的数据无法解析，请稍后刷新。",
			balanceUnrecognized: "余额接口返回的数据格式暂不支持，请稍后刷新。",
			balanceRejected: "余额接口拒绝了此 Key（401），请检查 Key 状态。",
			balanceForbidden: "余额接口拒绝查询（402/403），请检查 Key 的查询权限。",
			balanceRateLimited: "余额查询过于频繁（429），请稍后刷新。",
			balanceTimeout: "余额接口响应超时，请稍后刷新。",
			balanceNetwork: "无法连接余额接口，请稍后刷新。",
			balanceHttp: "余额接口返回 HTTP {status}，请稍后刷新。",
			empty: "还没有 Key。添加一个即可在模型选择器里看到 ApophisCode 的模型。",
			inviteLead: "请在 Apophis 站点获取自己的 API Key：",
			inviteLink: "www.apophis.uk ↗",
			keysHint: "按顺序使用：当前 Key 不可用时自动切到下一个；「切到此 Key」指定优先使用的 Key。",
			keyActive: "使用中",
			keyDisabled: "已停用",
			keyUse: "切到此 Key",
			keyEnable: "重新启用",
			keyDisable: "停用",
			keyRemove: "删除",
			keyRename: "重命名",
			keyRenameSave: "保存",
			keyRenameCancel: "取消",
			keyRenamePlaceholder: "新的备注名",
			keyUnlimited: "不限额度",
			keyNoBalance: "余额未知",
			keyRemaining: "剩余",
			keyUsed: "已用",
			accountLimit: "额度",
			keyName: "账户名",
			keyNameUnknown: "账户名待读取",
			keyStatus: "状态",
			keyNotValid: "用量接口报告此 Key 当前无效",
			resetMonthly: "每月重置",
			resetWeekly: "每周重置",
			resetDaily: "每日重置",
			resetNever: "不重置",
			loadFailed: "读取失败",
			removeAll: "清空全部",
			addTitle: "添加 Key",
			addKeyPlaceholder: "粘贴 API Key",
			addLabelPlaceholder: "备注（可选）",
			add: "添加",
			notWritable: "当前 profile 不允许写入设置，改动只在本次运行内生效。",
			error: "读取 ApophisCode 状态失败",
			saveError: "更新 Key 失败",
			cliTitle: "Claude Code CLI",
			cliIntro: "未取得当前 Key 的分组证据时，自动模式使用 HTTP。可明确选择本机 Claude Code CLI 作为请求通道；DSH 继续负责工具、权限、计划模式、附件和历史。Apophis 的客户端限制与 CLI 兼容性仍需单独验证。",
			cliTransportTitle: "Claude 通道",
			cliTransportAuto: "自动（默认 HTTP）",
			cliTransportCli: "始终用 CLI",
			cliTransportHttp: "始终用 HTTP",
			cliTransportAutoHint: "未取得 Apophis 当前 Key 的分组证据，自动模式使用 HTTP；需要 CLI 时请明确选择。",
			cliTransportCliHint: "所有 Claude 请求都由 Claude Code CLI 发出，需要本机已安装 CLI。",
			cliTransportHttpHint: "所有 Claude 请求都走 HTTP；网关拒绝时会显示实际错误，不会自动改用 CLI。",
			cliTransportNotWritable: "当前 profile 不允许写入设置，通道选择无法保存。",
			cliTransportFailed: "保存 Claude 通道失败",
			cliProcesses: "运行中的 CLI 会话 {live} 个 · 已启动 {opened} 次 · 续接 {continued} 次",
			cliChecking: "正在检测本机的 Claude Code CLI…",
			cliInstalled: "已安装",
			cliVersion: "版本",
			cliPath: "位置",
			cliRecheck: "重新检测",
			cliMissing: "未检测到 Claude Code CLI",
			cliMissingHint: "仅在明确选择 Claude CLI 通道时需要安装。自动模式使用 HTTP；Apophis 的 CLI 接口兼容性仍待验证。",
			cliConfiguredMissing: "设置里指定的 CLI 路径不存在：{path}",
			cliBroken: "找到了 CLI，但无法运行",
			cliInstall: "安装 Claude Code CLI",
			cliReinstall: "重新安装",
			cliInstalling: "正在安装…（通常需要一两分钟，请勿关闭 DSH）",
			cliInstallCommand: "将在本机执行：{command}（需要 Node.js 18 或更高版本）",
			cliInstallSucceeded: "安装完成。",
			cliInstallFailed: "安装失败",
			cliNpmMissing: "没有找到 npm。请先从 https://nodejs.org 安装 Node.js（18 或更高版本），然后再点安装。",
			cliPermission: "npm 没有权限写入全局目录。请在终端执行 sudo {command}，或把 npm 的全局目录改到用户目录后重试。",
			cliPermissionWindows: "npm 没有权限写入全局目录。请以管理员身份打开终端执行 {command}，然后点「重新检测」。",
			cliNetwork: "下载失败，请检查网络或 npm 镜像设置后重试。",
			cliTimeout: "安装超时，请检查网络后重试。",
			cliNotFoundAfterInstall: "npm 显示安装完成，但仍找不到 claude 命令。请在终端执行 claude --version 确认，然后点「重新检测」。",
			cliWindowsNote: "Windows 上 Claude Code 还需要 Git for Windows（https://git-scm.com/downloads/win）。",
			modelsTitle: "显示的模型",
			modelsIntro: "型号来自当前使用中的 Key，默认全选。支持的思考档位随型号变化，可在对话模型选择器调整。首次调用部分型号时会进行短文本检查，可能消耗少量额度。",
			modelsChecking: "正在读取模型设置…",
			modelsFailed: "模型设置读取或保存失败",
			modelsAll: "全选",
			modelsNone: "全不选",
			modelsCount: "已选 {count} / {total}",
			modelsEmpty: "未勾选任何模型，切换列表将隐藏 ApophisCode 的模型。",
			advanced: "高级：接口地址",
			apiHost: "模型接口地址",
			statusHost: "余额接口地址",
			composerLabel: "ApophisCode 剩余额度",
			composerKey: "当前 Key",
			composerNoKey: "无可用 Key",
			composerUnread: "余额读取失败",
			composerStale: "上次读取于 {time}，本次读取失败",
			quotaReadAt: "更新于 {time}",
			versionTitle: "插件版本",
			versionCurrent: "当前版本",
			versionLatest: "最新版本",
			versionCheck: "检查更新",
			versionChecking: "正在检查更新…",
			versionFailed: "无法检查最新版本。",
			versionUpToDate: "已是最新版本",
			versionReleases: "发布列表",
			versionUnpublished: "npm 尚无公开的 latest 版本，暂不能在线更新。",
			versionLocal: "本地适配版本，未配置在线更新源。请重新构建并安装本地包。",
			versionAvailable: "发现新版本 v{version}",
			versionLinked: "当前从本地文件或开发链接安装。请在插件管理器中显式安装新包或 npm 精确版本。",
			versionManual: "无法在这里更新。请在桌面应用的插件页重新安装 dsh-apophiscode-api。",
			versionUpdate: "更新插件",
			versionUpdating: "正在更新…",
			versionUpdateFailed: "更新未完成，请点击“更新插件”重试。若仍失败，请反馈此问题。",
			versionUpdateInstallerFailed: "无法启动更新程序。请反馈此问题，插件尚未更新。",
			versionUpdateNetworkFailed: "连接更新服务器失败，请稍后点击“更新插件”重试。",
			versionUpdatePermissionFailed: "没有权限写入插件目录，更新未完成。请反馈此问题。",
			versionUpdateDiskFull: "磁盘空间不足，请释放空间后点击“更新插件”重试。",
			versionUpdateTimedOut: "更新等待超时，请稍后点击“更新插件”重试。",
			versionUpdateNotInstalled: "新版尚未安装成功，请点击“更新插件”重试。",
			versionUpdateCheckFailed: "无法获取最新版本，请稍后点击“更新插件”重试。",
			versionCooling: "v{version} 发布不久，DSH 的 pnpm 要等新版本过了发布冷却期才会安装，请稍后再更新。",
			versionCoolingUntil: "v{version} 发布不久，DSH 的 pnpm 要等新版本过了发布冷却期才会安装，{time} 之后可以更新。",
			versionUpdated: "已安装 v{version}，重新打开 DSH 后生效。",
			versionInstalledPending: "已安装 v{version}，请完全退出并重新打开 DSH，使新版生效。",
			versionUpdatedHint: "请完全退出并重新打开 DSH，使新版生效。重新打开后，这里会显示新版版本号。",
			versionRestart: "如何重启",
			versionRestartHint: "插件无法安全地重启桌面应用。请完全退出 DSH，再重新打开。",
			versionRefresh: "刷新界面",
			versionLater: "稍后",
			diagTitle: "诊断信息",
			diagIntro: "遇到回答被截断（已达到输出 token 上限）、请求反复失败等问题时，选择出问题的会话，生成诊断信息并复制给插件作者。",
			diagSession: "会话",
			diagGenerate: "生成诊断信息",
			diagGenerating: "正在生成…",
			diagReport: "诊断信息内容",
			diagCopy: "复制",
			diagCopied: "已复制",
			diagSelected: "已选中全部内容，请按 ⌘C 或 Ctrl+C 复制。",
			diagPrivacy: "只包含模型、推理档位、输出上限、每一步的 token 用量和错误码，不含对话内容、文件路径和 Key。",
			diagNoSessions: "还没有会话。",
			diagLive: "进行中",
			diagNoFolder: "无目录",
			diagError: "生成诊断信息失败",
			searchTitle: "网页搜索",
			searchModelTitle: "搜索模型",
			searchModelDefault: "使用当前 Key 返回的第一个型号",
			searchModelHint: "从当前 Key 的目录中选择。搜索需要网关原生搜索和结构化来源；基础文本成功不代表支持搜索。",
			searchScope: "DSH 全局设置",
			searchIntro: "DSH 的 web_search 可使用这里选择的 DeepSeek/GPT 后端，Claude 与其它模型遵循相同的路由设置。每次搜索是独立的模型调用，用插件保存的 Key 计费。",
			searchChecking: "正在读取搜索设置…",
			searchLoadFailed: "搜索设置读取或保存失败",
			searchModeTitle: "DSH 路由",
			searchModeDefault: "不接管",
			searchModeDefaultHint: "不改动 DSH 的搜索路由（默认）。切回此项会移除本插件写入 profile 的搜索补丁。",
			searchModeAuto: "按模型",
			searchModeAutoHint: "ApophisCode 模型用 ApophisCode 搜索；其他模型仍走原来的搜索（DSH 默认搜索，或其他插件的设置）。",
			searchModeApophisCode: "始终 ApophisCode",
			searchModeApophisCodeHint: "原本由 DSH 默认搜索处理的请求都改走 ApophisCode。Codex、Kimi 等订阅插件接管的模型仍按它们自己的设置。",
			searchEffective: "当前生效：基础搜索 {base} · 运行时 {runtime}",
			searchPatchNote: "「按模型」和「始终」会在本 profile 的 cordis.patch.yml 里写入一段带标记的 web 配置，热加载生效，无需重启。卸载插件前请先切回「不接管」。",
			searchApplyFailed: "写入搜索补丁失败：{error}",
			searchForeign: "检测到 {names} 订阅插件：它们接管的模型仍按各自的搜索设置，其余请求才会到达这里的选择。",
			searchOverridden: "基础搜索现在是 {base}，不是 ApophisCode：可能还在热加载，或被其他插件的补丁覆盖。",
			searchUnavailable: "当前运行环境没有 DSH 网页搜索服务，搜索路由暂不生效。",
			searchNotWritable: "当前 profile 不允许写入设置。",
			searchUnknown: "未知"
		};
		const en = {
			nav: "ApophisCode",
			modelsTitle: "Visible models",
			modelsIntro: "Models come from the active key and are all selected by default. Available reasoning levels vary by model and can be changed in the conversation model picker. Some models need an initial short-text check, which may consume a small amount of quota.",
			modelsChecking: "Reading model settings…",
			modelsFailed: "Could not read or save model settings",
			modelsAll: "Select all",
			modelsNone: "Select none",
			modelsCount: "{count} / {total} selected",
			modelsEmpty: "No models selected. ApophisCode models are hidden from the picker.",
			intro: "Add an API key to use ApophisCode in DSH. Manage the current key's models under Visible models below.",
			accountsTitle: "Accounts and keys",
			imagesTitle: "Image generation and editing",
			imagesBalanceLoading: "Reading image key balances…",
			imagesBalanceFailed: "Could not read image balances",
			imagesComposerLabel: "Image balance",
			imagesBalanceKey: "Current image key",
			imagesBalanceHint: "Only image key balances appear here. They update every minute, or use Refresh. Conversation key balances are shown separately.",
			imagesIntro: "Use a dedicated image key with ApophisCode’s Images API. Describe a new image or attach images with editing instructions. The image engine is independent of the conversation model. Original PNGs are saved locally and previews appear in chat.",
			imagesEnabled: "Generate and edit images",
			imagesOn: "Enabled",
			imagesOff: "Disabled",
			imagesModel: "Image model",
			imagesQuality: "Request quality",
			imagesQuality_auto: "Auto",
			imagesQuality_low: "Low",
			imagesQuality_medium: "Medium",
			imagesQuality_high: "High",
			imagesQuality_xhigh: "Extra high (xhigh)",
			imagesQuality_max: "Maximum (max)",
			imagesModelDefault: "Use the first model returned by the active image key",
			imagesQualityHint: "auto preserves server defaults. Other qualities come from gateway declarations. A directory entry does not prove image support. Failures never change the model or quality.",
			imagesAddKey: "Add an image key",
			imagesKeyPlaceholder: "Paste the dedicated image API key",
			imagesNoKey: "No image key yet. Add one to enable the image tool. Conversation keys are never used for images.",
			imagesLoadFailed: "Could not read image settings. If you just updated the local plugin, reload it and reopen settings.",
			imagesUnavailable: "This host does not provide image attachments; the image tool is unavailable.",
			imagesCreate: "Create image",
			imagesShortcutHint: "Add a ApophisCode image instruction to the draft, describe the image, then send.",
			imagesDraft: "Use apophiscode_image_generate with the saved ApophisCode image model and quality. Edit the attached references when provided; otherwise generate a new image. Image requirements:",
			imagesDraftBusy: "The composer is busy or contains references. Describe the image requirements directly in the draft.",
			imagesGenerating: "Generating…",
			imagesFailed: "Generation failed",
			imagesDone: "Generated",
			imagesOpen: "Open image",
			imagesRetryPreview: "Preview failed; click to retry",
			imagesLoadingPreview: "Loading image…",
			imagesViewerTitle: "Image preview",
			imagesClosePreview: "Close image preview",
			imagesDownloadOriginal: "Download original",
			imagesDownloadPreparing: "Preparing original…",
			imagesDownloadFailed: "Could not save the original. Check that the original file still exists on this device, then try Download original again.",
			refresh: "Refresh",
			refreshing: "Refreshing…",
			staleNote: "Last read at {time}; this read failed: {error}",
			balanceUnavailable: "Balance update unavailable",
			balanceStale: "Balance update unavailable. Showing the balance last read successfully at {time}.",
			balanceUnreadable: "The balance endpoint returned unreadable data. Refresh later.",
			balanceUnrecognized: "The balance endpoint returned an unsupported format. Refresh later.",
			balanceRejected: "The balance endpoint rejected this key (401). Check its status.",
			balanceForbidden: "The balance endpoint refused the query (402/403). Check the key’s query permissions.",
			balanceRateLimited: "Balance queries are rate limited (429). Refresh later.",
			balanceTimeout: "The balance endpoint timed out. Refresh later.",
			balanceNetwork: "Could not connect to the balance endpoint. Refresh later.",
			balanceHttp: "The balance endpoint returned HTTP {status}. Refresh later.",
			empty: "No keys yet. Add one and the ApophisCode models appear in the model picker.",
			inviteLead: "Get your API key from the Apophis site:",
			inviteLink: "www.apophis.uk ↗",
			keysHint: "Used in order: when the active key cannot serve a request, the next one takes over. “Use this key” picks the preferred key.",
			keyActive: "Active",
			keyDisabled: "Disabled",
			keyUse: "Use this key",
			keyEnable: "Re-enable",
			keyDisable: "Disable",
			keyRemove: "Remove",
			keyRename: "Rename",
			keyRenameSave: "Save",
			keyRenameCancel: "Cancel",
			keyRenamePlaceholder: "New name",
			keyUnlimited: "No quota limit",
			keyNoBalance: "Balance unknown",
			keyRemaining: "Remaining",
			keyUsed: "Used",
			accountLimit: "Limit",
			keyName: "Account",
			keyNameUnknown: "Account name not read yet",
			keyStatus: "Status",
			keyNotValid: "The usage endpoint reports that this key is not currently valid",
			resetMonthly: "resets monthly",
			resetWeekly: "resets weekly",
			resetDaily: "resets daily",
			resetNever: "does not reset",
			loadFailed: "Read failed",
			removeAll: "Remove all",
			addTitle: "Add a key",
			addKeyPlaceholder: "Paste API key",
			addLabelPlaceholder: "Label (optional)",
			add: "Add",
			notWritable: "This profile does not allow settings writes; changes apply to this run only.",
			error: "Could not read ApophisCode status",
			saveError: "Could not update the keys",
			cliTitle: "Claude Code CLI",
			cliIntro: "Without evidence of this key's group membership, automatic mode uses HTTP. You can explicitly choose the local Claude Code CLI as the transport; DSH still owns tools, permissions, plan mode, attachments and history. Apophis client restrictions and CLI compatibility need separate verification.",
			cliTransportTitle: "Claude route",
			cliTransportAuto: "Automatic (HTTP by default)",
			cliTransportCli: "Always CLI",
			cliTransportHttp: "Always HTTP",
			cliTransportAutoHint: "Without evidence of the current Apophis key's groups, automatic mode uses HTTP. Choose CLI explicitly when needed.",
			cliTransportCliHint: "Every Claude request is sent by the Claude Code CLI, which must be installed.",
			cliTransportHttpHint: "Every Claude request uses HTTP. Gateway failures remain visible without automatically switching to CLI.",
			cliTransportNotWritable: "This profile does not allow writing settings, so the route cannot be saved.",
			cliTransportFailed: "Could not save the Claude route",
			cliProcesses: "{live} CLI session(s) running · started {opened} · continued {continued}",
			cliChecking: "Checking this device for the Claude Code CLI…",
			cliInstalled: "Installed",
			cliVersion: "Version",
			cliPath: "Location",
			cliRecheck: "Check again",
			cliMissing: "Claude Code CLI not found",
			cliMissingHint: "Install only when explicitly selecting the Claude CLI transport. Automatic mode uses HTTP; Apophis CLI compatibility remains unverified.",
			cliConfiguredMissing: "The CLI path set in settings does not exist: {path}",
			cliBroken: "The CLI was found but could not run",
			cliInstall: "Install Claude Code CLI",
			cliReinstall: "Reinstall",
			cliInstalling: "Installing… (usually a minute or two; keep DSH open)",
			cliInstallCommand: "Runs on this device: {command} (requires Node.js 18 or later)",
			cliInstallSucceeded: "Installed.",
			cliInstallFailed: "Install failed",
			cliNpmMissing: "npm was not found. Install Node.js 18 or later from https://nodejs.org, then click Install again.",
			cliPermission: "npm cannot write its global directory. Run sudo {command} in a terminal, or point npm’s global prefix at a folder you own, then retry.",
			cliPermissionWindows: "npm cannot write its global directory. Open a terminal as administrator, run {command}, then click Check again.",
			cliNetwork: "The download failed. Check your network or npm registry settings and retry.",
			cliTimeout: "The install timed out. Check your network and retry.",
			cliNotFoundAfterInstall: "npm reported success, but the claude command still cannot be found. Run claude --version in a terminal, then click Check again.",
			cliWindowsNote: "On Windows, Claude Code also needs Git for Windows (https://git-scm.com/downloads/win).",
			advanced: "Advanced: endpoints",
			apiHost: "Model endpoint",
			statusHost: "Balance endpoint",
			composerLabel: "ApophisCode remaining balance",
			composerKey: "Current key",
			composerNoKey: "No usable key",
			composerUnread: "Balance unavailable",
			composerStale: "Last read at {time}; this read failed",
			quotaReadAt: "Updated at {time}",
			versionTitle: "Plugin version",
			versionCurrent: "Current version",
			versionLatest: "Latest version",
			versionCheck: "Check for updates",
			versionChecking: "Checking for updates…",
			versionFailed: "Could not check the latest version.",
			versionUpToDate: "Up to date",
			versionReleases: "Release list",
			versionUnpublished: "No public latest version is available on npm yet. Online updates are unavailable.",
			versionLocal: "Local adaptation; no online update source is configured. Rebuild and reinstall the local package.",
			versionAvailable: "v{version} is available",
			versionLinked: "Installed from a local file or development link. Explicitly install a new package or an exact npm version in the plugin manager.",
			versionManual: "This install cannot be updated here. Reinstall dsh-apophiscode-api from the desktop Plugins page.",
			versionUpdate: "Update plugin",
			versionUpdating: "Updating…",
			versionUpdateFailed: "The update did not finish. Click “Update plugin” to retry. If it still fails, report this issue.",
			versionUpdateInstallerFailed: "The updater could not start. Please report this issue; the plugin has not been updated.",
			versionUpdateNetworkFailed: "Could not reach the update server. Click “Update plugin” to retry later.",
			versionUpdatePermissionFailed: "The plugin directory is not writable. The update did not finish; please report this issue.",
			versionUpdateDiskFull: "There is not enough disk space. Free some space, then click “Update plugin” to retry.",
			versionUpdateTimedOut: "The update timed out. Click “Update plugin” to retry later.",
			versionUpdateNotInstalled: "The new version was not installed successfully. Click “Update plugin” to retry.",
			versionUpdateCheckFailed: "Could not get the latest version. Click “Update plugin” to retry later.",
			versionCooling: "v{version} was published recently. DSH’s pnpm installs a new version only after its release cooldown; update again later.",
			versionCoolingUntil: "v{version} was published recently. DSH’s pnpm installs a new version only after its release cooldown; update after {time}.",
			versionUpdated: "Installed v{version}; reopen DSH to use it.",
			versionInstalledPending: "v{version} is installed. Quit DSH completely and reopen it to use the new version.",
			versionUpdatedHint: "Quit DSH completely and reopen it to use the new version. This card will then show the new version number.",
			versionRestart: "How to restart",
			versionRestartHint: "The plugin cannot safely restart the desktop application. Quit DSH completely, then open it again.",
			versionRefresh: "Refresh page",
			versionLater: "Later",
			diagTitle: "Diagnostics",
			diagIntro: "If replies are cut off (\"output token limit reached\") or requests keep failing, pick the affected session, generate its diagnostics and send them to the plugin author.",
			diagSession: "Session",
			diagGenerate: "Generate diagnostics",
			diagGenerating: "Generating…",
			diagReport: "Diagnostics text",
			diagCopy: "Copy",
			diagCopied: "Copied",
			diagSelected: "All text is selected; press ⌘C or Ctrl+C to copy.",
			diagPrivacy: "Contains only models, reasoning effort, output limits, per-step token usage and error codes — no conversation text, file paths or keys.",
			diagNoSessions: "No sessions yet.",
			diagLive: "open",
			diagNoFolder: "no folder",
			diagError: "Could not generate diagnostics",
			searchTitle: "Web search",
			searchModelTitle: "Search model",
			searchModelDefault: "Use the first model returned by the active key",
			searchModelHint: "Choose from the active key directory. Search requires native gateway search and structured sources; basic text success does not prove search support.",
			searchScope: "DSH-wide setting",
			searchIntro: "DSH’s web_search can use the DeepSeek/GPT backend selected here. Claude follows the same routing settings as other models. Each search is a separate model call billed to the plugin-stored keys.",
			searchChecking: "Reading the search preference…",
			searchLoadFailed: "Could not read or save the search preference",
			searchModeTitle: "DSH routing",
			searchModeDefault: "Off",
			searchModeDefaultHint: "Leave DSH search routing untouched (the default). Switching back here removes the search patch this plugin wrote into the profile.",
			searchModeAuto: "By model",
			searchModeAutoHint: "ApophisCode models search through ApophisCode; other models keep the search they had (DSH’s default, or another plugin’s choice).",
			searchModeApophisCode: "Always ApophisCode",
			searchModeApophisCodeHint: "Every request DSH’s default search would have served goes through ApophisCode. Models another subscription plugin (Codex, Kimi) routes keep that plugin’s choice.",
			searchEffective: "In effect: base search {base} · runtime {runtime}",
			searchPatchNote: "By model and Always write a marked web entry into this profile’s cordis.patch.yml; it hot-applies, no restart needed. Switch back to Off before uninstalling the plugin.",
			searchApplyFailed: "Could not write the search patch: {error}",
			searchForeign: "{names} subscription plugin detected: the models it routes keep its own search choice; only the other requests reach the choice made here.",
			searchOverridden: "The base search is {base}, not ApophisCode: the reload may still be running, or another plugin’s patch overrides it.",
			searchUnavailable: "This runtime has no DSH web search service; search routing has no effect.",
			searchNotWritable: "This profile does not allow settings writes.",
			searchUnknown: "unknown"
		};
		/** Authored update errors shared by the host and localized settings page. */
		const UPDATE_ERRORS = Object.freeze({
			versionUpdateInstallerFailed: "ApophisCode plugin update could not start the installer",
			versionUpdateNetworkFailed: "ApophisCode plugin update could not reach the package registry",
			versionUpdatePermissionFailed: "ApophisCode plugin update could not write to the plugin directory",
			versionUpdateDiskFull: "ApophisCode plugin update ran out of disk space",
			versionUpdateTimedOut: "ApophisCode plugin update timed out",
			versionUpdateNotInstalled: "ApophisCode plugin update did not install the requested version",
			versionUpdateCheckFailed: "ApophisCode plugin version check failed"
		});
		/** Unknown errors never expose installer output or host paths in the UI. */
		function updateFailureCopy(error) {
			return Object.keys(UPDATE_ERRORS).find((key) => UPDATE_ERRORS[key] === error?.message) ?? "versionUpdateFailed";
		}
		/**
		* The settings panel's stylesheet, built only from DSH design tokens so it
		* follows the host theme (light and dark) and matches the host's own settings
		* pages: settings cards, hairline-divided rows, 0.5px tags, layer-1 inputs.
		* Fallbacks cover hosts that predate the settings-card tokens.
		*
		* @module dsh-apophiscode-api/client-style
		*/
		const STYLE = `
.apc{display:flex;flex-direction:column;gap:16px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
.apc-intro{margin:0;color:var(--dsw-alias-label-tertiary)}
.apc-card{display:flex;flex-direction:column;gap:14px;padding:16px 18px;border:.5px solid var(--dsw-alias-settings-card-stroke,var(--dsw-alias-border-l4,rgba(127,127,127,.3)));border-radius:var(--dsw-radius-xl,20px);background:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2))}
.apc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:28px}
.apc-title{display:flex;align-items:center;gap:8px;margin:0;font-size:15px;font-weight:600;line-height:22px}
.apc-note{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.apc-link{color:var(--dsw-alias-link,#3964fe);font-weight:500;text-decoration:none;word-break:break-all}
.apc-link:hover,.apc-link:focus{outline:none;text-decoration:underline dotted var(--dsw-alias-link,#3964fe);text-underline-offset:3px}
.apc-warn{margin:0;color:var(--dsw-alias-state-warn-label,#dd8629);font-size:12px;line-height:18px}
.apc-error{margin:0;color:var(--dsw-alias-state-error-primary,#ec1313);font-size:12px;line-height:18px}
.apc-label{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px}
.apc-mono{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12px;word-break:break-all}
.apc-detail{margin:0;padding:8px 10px;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-markdown-code-block);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:pre-wrap;word-break:break-all;max-height:160px;overflow:auto}

.apc-btn{box-sizing:border-box;display:inline-flex;flex:none;align-items:center;justify-content:center;gap:4px;height:28px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;white-space:nowrap;cursor:pointer}
.apc-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.apc-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.apc-btn:disabled{opacity:.4;cursor:not-allowed}
.apc-btn[data-size=md]{height:32px;padding:0 14px;border-radius:var(--dsw-radius-md,12px);font-size:13px}
.apc-btn[data-variant=primary]{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.apc-btn[data-variant=primary]:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.apc-btn[data-variant=ghost]{border-color:transparent;color:var(--dsw-alias-label-secondary)}
.apc-btn[data-variant=danger]{border-color:transparent;color:var(--dsw-alias-state-error-primary)}
.apc-btn[data-variant=danger]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}

.apc-input{box-sizing:border-box;flex:1 1 200px;min-width:0;height:32px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none}
.apc-input:focus{border-color:var(--dsw-alias-state-business-primary)}
.apc-input::placeholder{color:var(--dsw-alias-label-caption)}
.apc-input:disabled{opacity:.5}
.apc-diag-session{flex:1 1 260px;max-width:480px;cursor:pointer}
.apc-diag-text{width:100%;height:auto;min-height:220px;padding:8px 10px;line-height:18px;resize:vertical;white-space:pre;overflow:auto}
.apc-image-choice{flex:none;width:100%;max-width:300px;cursor:pointer}
.apc-image-shortcut{display:inline-flex;align-items:center;gap:8px}
.apc-quota{position:relative;display:inline-flex;align-items:center}
.apc-quota-value{cursor:help;border-radius:var(--dsw-radius-xs,4px)}
.apc-quota-value:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.apc-quota-tooltip{position:absolute;bottom:calc(100% + 8px);left:0;z-index:100;box-sizing:border-box;width:max-content;max-width:min(320px,calc(100vw - 32px));padding:10px 12px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv1);font-size:12px;line-height:20px;white-space:pre-line;overflow-wrap:anywhere;visibility:hidden;opacity:0;pointer-events:none}
.apc-quota[data-align=end]>.apc-quota-tooltip{left:auto;right:0}
.apc-quota:hover>.apc-quota-tooltip,.apc-quota:focus-within>.apc-quota-tooltip{visibility:visible;opacity:1}
.apc-image-result,.apc-image-chat{display:flex;flex-direction:column;gap:10px;padding:8px 0}
.apc-generated-image{display:grid;place-items:center;align-self:flex-start;max-width:100%;width:320px;min-height:80px;padding:0;overflow:hidden;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:zoom-in}
.apc-generated-image img{display:block;max-width:100%;max-height:480px;object-fit:contain}
.apc-image-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.84);box-sizing:border-box}
.apc-image-viewer{display:flex;flex-direction:column;box-sizing:border-box;width:100%;height:100%;min-height:0;color:#f5f5f5;font:13px/1.5 var(--ds-font-family,system-ui,sans-serif)}
.apc-image-viewer-toolbar{display:flex;align-items:center;gap:8px;flex:0 0 auto;min-height:40px;margin-bottom:12px}
.apc-image-viewer-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.75)}
.apc-image-viewer-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;box-sizing:border-box;flex:none;height:36px;padding:0 12px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(255,255,255,.08);color:#f5f5f5;font:inherit;cursor:pointer;white-space:nowrap}
.apc-image-viewer-button:hover:not(:disabled){background:rgba(255,255,255,.18)}
.apc-image-viewer-button:focus-visible{outline:2px solid #a7c3ff;outline-offset:2px}
.apc-image-viewer-button:disabled{opacity:.55;cursor:wait}
.apc-image-viewer-close{width:36px;padding:0;border-color:transparent;background:transparent}
.apc-image-viewer-canvas{display:flex;align-items:center;justify-content:center;flex:1;min-height:0;overflow:hidden}
.apc-image-viewer-canvas img{display:block;flex:none;width:auto;height:auto;max-width:100%;max-height:100%;min-width:0;min-height:0;object-fit:contain}
.apc-image-viewer-error{align-self:center;flex:none;margin:12px 0 0;padding:8px 12px;border-radius:8px;background:#4d2222;color:#ffd3d3;text-align:center}
.apc-form{display:flex;flex-wrap:wrap;align-items:center;gap:8px}

.apc-chip{flex:none;padding:0 8px;border-radius:999px;font-size:11px;font-weight:500;line-height:18px;white-space:nowrap}
.apc-chip[data-tone=success]{background:var(--dsw-alias-state-success-tertiary);color:var(--dsw-alias-state-success-primary)}
.apc-chip[data-tone=danger]{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.apc-chip[data-tone=info]{background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-state-business-primary)}
.apc-chip[data-tone=neutral]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.apc-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.apc-dot[data-tone=success]{background:var(--dsw-alias-state-success-primary)}
.apc-dot[data-tone=warn]{background:var(--dsw-alias-state-warn-primary)}
.apc-dot[data-tone=danger]{background:var(--dsw-alias-state-error-primary)}


.apc-list{display:flex;flex-direction:column}
.apc-row{display:flex;flex-direction:column;gap:8px;padding:12px 0;border-top:.5px solid var(--dsw-alias-border-l2)}
.apc-row:first-child{border-top:0;padding-top:2px}
.apc-row-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px}
.apc-row-name{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;font-weight:500}
.apc-row-name>.apc-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.apc-actions{display:flex;flex-wrap:wrap;gap:4px}
.apc-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}
.apc-figures{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 16px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.apc-figures b{margin-left:4px;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.apc-bar{height:4px;overflow:hidden;border-radius:999px;background:var(--dsw-alias-interactive-bg-active)}
.apc-bar>span{display:block;height:100%;border-radius:inherit;background:var(--dsw-alias-state-success-primary)}
.apc-bar[data-level=warn]>span{background:var(--dsw-alias-state-warn-primary)}
.apc-bar[data-level=low]>span{background:var(--dsw-alias-state-error-primary)}
.apc-add{display:flex;flex-direction:column;gap:8px;padding-top:14px;border-top:.5px solid var(--dsw-alias-border-l2)}

.apc-models{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0;padding:0;min-width:0;border:0}
.apc-model{display:flex;align-items:center;gap:10px;min-width:0;padding:10px 12px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-interactive-bg-hover);cursor:pointer}
.apc-model>input{flex:none;width:16px;height:16px;margin:0;accent-color:var(--dsw-alias-state-business-primary)}
.apc-model>span{display:flex;flex-direction:column;min-width:0;gap:2px}
.apc-model b{font-size:13px;font-weight:500}
.apc-models:disabled .apc-model{opacity:.5;cursor:not-allowed}

.apc-setting{display:grid;grid-template-columns:112px minmax(0,1fr);gap:6px 16px;align-items:start}
.apc-setting>.apc-label{padding-top:5px}
.apc-setting>div{display:flex;flex-direction:column;gap:6px;min-width:0}
.apc-seg{display:inline-flex;flex-wrap:wrap;align-self:flex-start;gap:2px;max-width:100%;padding:2px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-interactive-bg-hover)}
.apc-seg>button{height:28px;padding:0 12px;border:0;border-radius:calc(var(--dsw-radius-md,12px) - 2px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer}
.apc-seg>button:hover:not(:disabled):not([aria-checked=true]){color:var(--dsw-alias-label-primary)}
.apc-seg>button[aria-checked=true]{background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);font-weight:500;box-shadow:var(--dsw-shadow-lv1)}
.apc-seg>button:disabled{cursor:not-allowed;opacity:.5}
.apc-status{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:13px}
.apc-status>b{font-weight:600;font-variant-numeric:tabular-nums}
.apc-callout{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-state-warn-tertiary)}
.apc-callout[data-tone=info]{background:var(--dsw-alias-state-business-tertiary)}
.apc-callout>.apc-title{font-size:13px}
.apc-split{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}

.apc-advanced>summary{width:fit-content;padding:2px 4px;margin-left:-4px;border-radius:var(--dsw-radius-sm,8px);color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px;cursor:pointer}
.apc-advanced>summary:hover{background:var(--dsw-alias-interactive-bg-hover)}
.apc-advanced[open]>summary{margin-bottom:10px}
.apc-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}

.apc-composer{display:inline-flex;flex:0 0 auto;align-items:center;box-sizing:border-box;height:28px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:20px;font-variant-numeric:tabular-nums;white-space:nowrap;user-select:none}

@media (max-width:640px){
  .apc-setting{grid-template-columns:1fr}
  .apc-models{grid-template-columns:1fr}
  .apc-setting>.apc-label{padding-top:0}
}
`;
		/** Project this plugin's durable image results into chat without duplicating context. */
		const IMAGE_CHAT_KIND = "apophiscode-image-output";
		const IMAGE_TOOLS = /* @__PURE__ */ new Set(["apophiscode_image_generate", "claude_code"]);
		const hasImage = (content) => Array.isArray(content) && content.some((part) => part.type === "image" && part.attachment);
		function successfulImages(event) {
			if (event?.type === "tool/result" && event.data?.meta?.kind === "apophiscode-image") {
				const message = event.data.message;
				const toolCallId = message?.source?.callId;
				if (message?.source?.kind !== "tool" || typeof toolCallId !== "string" || toolCallId === "" || message.isError === true || !hasImage(message.content)) return [];
				return [{
					type: "tool-result",
					toolCallId,
					content: message.content,
					isError: false,
					meta: event.data.meta
				}];
			}
			if (event?.type === "tool/ptc-dispatch" && IMAGE_TOOLS.has(event.data?.name) && event.data.isError === false && typeof event.data.subCallId === "string" && hasImage(event.data.content)) return [{
				type: "tool-result",
				toolCallId: event.data.subCallId,
				content: event.data.content,
				meta: { kind: "apophiscode-image" }
			}];
			const source = event?.data?.message?.source;
			if (event?.type !== "assistant/message" || source?.kind !== "model" || source.provider !== "apophiscode") return [];
			return (event.data.message.content ?? []).flatMap((block, index) => block.type === "image" && block.attachment ? [{
				type: "tool-result",
				toolCallId: `apophiscode-cli-image-${event.seq}-${index}`,
				content: [block]
			}] : []);
		}
		const imageConversationNode = {
			kind: IMAGE_CHAT_KIND,
			target: "chat",
			match(event) {
				const images = successfulImages(event);
				if (images.length === 0) return null;
				const id = event.type === "assistant/message" ? `cli:${event.seq}` : event.data?.subCallId ?? event.data?.message?.source?.callId ?? images[0].toolCallId ?? `event:${event.seq}`;
				return {
					id: String(id),
					role: "update"
				};
			},
			start: () => ({}),
			update: (context) => context.state ?? {},
			buildViewNode(context) {
				const results = context.matches.filter((match) => successfulImages(match.event).length > 0);
				if (results.length === 0) return null;
				const turn = (results.find((match) => match.location?.kind === "turn" || match.location?.kind === "step")?.location)?.turn;
				const finished = turn?.end;
				const blocks = [...new Map(results.flatMap(({ event }) => successfulImages(event).map((block) => [block.toolCallId, {
					...block,
					kind: "tool-result"
				}]))).values()];
				const answerSeq = turn?.steps?.at(-1)?.data.get("assistant-step")?.finalNode?.seq;
				const lastImageSeq = Math.max(...results.map((match) => match.event.seq));
				return {
					key: context.key,
					id: context.id,
					kind: IMAGE_CHAT_KIND,
					target: "chat",
					location: { kind: "session" },
					visibility: "visible",
					anchorSeq: answerSeq > lastImageSeq ? answerSeq + .025 : finished === void 0 ? lastImageSeq + .025 : finished.seq - .025,
					data: {
						...turn === void 0 ? {} : { turn: turn.turn },
						blocks
					}
				};
			}
		};
		/**
		* The quota total one key shows.
		*
		* Only an explicit quota limit from `/v1/usage` is a total. Wallet balances,
		* all-time usage costs and subscription period limits are distinct amounts.
		*
		* @module dsh-apophiscode-api/totals
		*/
		const amount = (value) => typeof value === "number" && Number.isFinite(value) ? value : void 0;
		/** Never infer a total by adding amounts from different billing scopes. */
		function quotaTotalUsd(usage) {
			if (usage?.unlimitedQuota === true) return void 0;
			return amount(usage?.limitUsd);
		}
		const fill = (text, values) => text.replace(/\{(\w+)\}/gu, (match, name) => values[name] === void 0 ? match : String(values[name]));
		function formatUsd(value) {
			if (typeof value !== "number" || !Number.isFinite(value)) return void 0;
			try {
				return new Intl.NumberFormat(void 0, {
					style: "currency",
					currency: "USD"
				}).format(value);
			} catch {
				return `$${value.toFixed(2)}`;
			}
		}
		function readTime(ms) {
			if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
			try {
				return new Date(ms).toLocaleTimeString(void 0, {
					hour: "2-digit",
					minute: "2-digit"
				});
			} catch {
				return new Date(ms).toISOString().slice(11, 16);
			}
		}
		const RESET_KEYS = {
			monthly: "resetMonthly",
			weekly: "resetWeekly",
			daily: "resetDaily",
			never: "resetNever"
		};
		/** Translate only reader-authored failures; keep other safe causes explicit. */
		function balanceFailureCopy(message, t) {
			if (message === "the gateway returned unreadable balance data") return t("balanceUnreadable");
			if (message === "the gateway returned an unrecognized usage payload") return t("balanceUnrecognized");
			if (message === "this API key was rejected (401)") return t("balanceRejected");
			if (message === "the gateway refused this key's balance read (402/403)") return t("balanceForbidden");
			if (message === "the gateway is rate limiting balance reads (429)") return t("balanceRateLimited");
			if (/^no answer within \d+s$/u.test(message)) return t("balanceTimeout");
			if (/^fetch failed(?: \([A-Z0-9_]+\))?$/u.test(message)) return t("balanceNetwork");
			const http = /^the gateway answered HTTP (\d{3})$/u.exec(message);
			return http === null ? message : fill(t("balanceHttp"), { status: http[1] });
		}
		/** The same quota presentation for conversation and image credential records. */
		function KeyBalance({ row, t }) {
			const usage = row?.usage;
			const totalUsd = quotaTotalUsd(usage);
			const figures = [
				usage?.unlimitedQuota === true ? [t("keyRemaining"), t("keyUnlimited")] : usage?.availableUsd === void 0 ? void 0 : [t("keyRemaining"), formatUsd(usage.availableUsd)],
				usage?.usedUsd === void 0 ? void 0 : [t("keyUsed"), formatUsd(usage.usedUsd)],
				totalUsd === void 0 ? void 0 : [t("accountLimit"), formatUsd(totalUsd)]
			].filter(Boolean);
			const meta = [
				usage?.name === void 0 ? t("keyNameUnknown") : `${t("keyName")} ${usage.name}`,
				usage?.status === void 0 ? void 0 : `${t("keyStatus")} ${usage.status}`,
				usage?.valid === false ? t("keyNotValid") : void 0,
				RESET_KEYS[usage?.resetPeriod] === void 0 ? void 0 : t(RESET_KEYS[usage.resetPeriod])
			].filter(Boolean).join(" · ");
			const share = usage?.unlimitedQuota !== true && totalUsd > 0 && typeof usage.availableUsd === "number" ? Math.max(0, Math.min(1, usage.availableUsd / totalUsd)) : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "apc-meta",
					children: meta
				}),
				figures.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "apc-figures",
					children: figures.map(([label, value]) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: value })] }, label))
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "apc-meta",
					children: row?.error === void 0 ? t("keyNoBalance") : `${t("balanceUnavailable")}：${balanceFailureCopy(row.error, t)}`
				}),
				share !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "apc-bar",
					"data-level": share < .1 ? "low" : share < .3 ? "warn" : "ok",
					role: "presentation",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: { width: `${Math.round(share * 100)}%` } })
				}),
				row?.stale !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "apc-warn",
					children: `${fill(t("balanceStale"), { time: readTime(row.stale.fetchedAt) })} ${balanceFailureCopy(row.stale.error ?? "", t)}`
				})
			] });
		}
		/**
		* A composer quota figure with the same details for either key ring. The help
		* cursor marks it; hovering or focusing it shows the key, its account, the
		* remaining, used and total quota and when it was read, and asks the caller
		* for an unforced read.
		* @param props.copy - the ring's own lines: `title`, `key`, `failed`, `loading`.
		* @param props.empty - what the figure shows while the remaining quota is unknown.
		* @param props.align - `end` opens the details leftward, for the composer's right side.
		*/
		function QuotaHover({ row, fetchedAt, loading = false, failed = false, empty, copy, align, onRefresh, t }) {
			const tooltipId = react.useId();
			const usage = row?.usage;
			const unlimited = usage?.unlimitedQuota === true;
			const remaining = unlimited ? t("keyUnlimited") : formatUsd(usage?.availableUsd);
			const stale = usage !== void 0 && (failed || row.stale !== void 0);
			const display = remaining ?? empty;
			const details = [
				copy.title,
				row?.label ? `${copy.key}: ${row.label}` : void 0,
				usage?.name ? `${t("keyName")}: ${usage.name}` : void 0,
				`${t("keyRemaining")}: ${remaining ?? "—"}`,
				`${t("keyUsed")}: ${formatUsd(usage?.usedUsd) ?? "—"}`,
				`${t("accountLimit")}: ${unlimited ? t("keyUnlimited") : formatUsd(quotaTotalUsd(usage)) ?? "—"}`,
				stale ? fill(t("composerStale"), { time: readTime(row.stale?.fetchedAt ?? fetchedAt) }) : failed || row?.error ? copy.failed : loading ? copy.loading : fetchedAt === void 0 ? void 0 : fill(t("quotaReadAt"), { time: readTime(fetchedAt) })
			].filter(Boolean).join("\n");
			const refresh = () => {
				onRefresh?.();
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "apc-quota",
				"data-align": align,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "apc-composer apc-quota-value",
					role: "status",
					tabIndex: 0,
					"aria-label": `${copy.title}: ${stale ? "≈" : ""}${display}`,
					"aria-describedby": tooltipId,
					onMouseEnter: refresh,
					onFocus: refresh,
					children: stale ? `≈${display}` : display
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "apc-quota-tooltip",
					id: tooltipId,
					role: "tooltip",
					children: details
				})]
			});
		}
		/** Mirror the host's next-usable image key using only its public balance rows. */
		function currentImageKey(balance) {
			const keys = balance?.keys ?? [];
			const start = Math.max(0, keys.findIndex((row) => row.id === balance.activeId));
			for (let offset = 0; offset < keys.length; offset += 1) {
				const row = keys[(start + offset) % keys.length];
				if (row.disabled !== true) return row;
			}
		}
		/** Mounted inside the visible Create image shortcut, so its timer shares that lifetime. */
		function ImageShortcutBalance({ call, t }) {
			const [view, setView] = react.useState({ loading: true });
			const refresh = react.useRef(() => {});
			react.useEffect(() => {
				let live = true, generation = 0, pending = false;
				const read = async (force = false, reset = false) => {
					if (!live || pending && !force) return;
					const current = ++generation;
					pending = true;
					setView((previous) => reset ? { loading: true } : {
						...previous,
						loading: true
					});
					try {
						const balance = await call("images/balance", { force });
						if (live && current === generation) setView({
							balance,
							loading: false
						});
					} catch {
						if (live && current === generation) setView((previous) => ({
							...previous,
							loading: false,
							failed: true
						}));
					} finally {
						if (current === generation) pending = false;
					}
				};
				refresh.current = read;
				read();
				const changed = () => {
					read(true, true);
				};
				const timer = window.setInterval(() => {
					read();
				}, 6e4);
				window.addEventListener("apophiscode-images-updated", changed);
				return () => {
					live = false;
					generation += 1;
					refresh.current = () => {};
					window.clearInterval(timer);
					window.removeEventListener("apophiscode-images-updated", changed);
				};
			}, [call]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuotaHover, {
				row: currentImageKey(view.balance),
				fetchedAt: view.balance?.fetchedAt,
				loading: view.loading,
				failed: view.failed === true,
				empty: view.loading ? "…" : "—",
				copy: {
					title: t("imagesComposerLabel"),
					key: t("imagesBalanceKey"),
					failed: t("imagesBalanceFailed"),
					loading: t("imagesBalanceLoading")
				},
				onRefresh: () => {
					refresh.current();
				},
				t
			});
		}
		/** Original PNG transfer. The chat preview is never used as the download source. */
		const MAX_BYTES = 48 * 1024 * 1024;
		const CHUNK_BYTES = 256 * 1024;
		function imageDownloadName(attachment) {
			const name = (typeof attachment?.name === "string" ? attachment.name : "apophiscode-generated.png").replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/gu, "-").replace(/[. ]+$/u, "").trim().slice(0, 160);
			return name === "" ? "apophiscode-generated.png" : name.replace(/\.(png|jpe?g|webp)$/iu, "") + ".png";
		}
		async function readOriginalImage(call, sessionId, attachmentId, { signal, onProgress } = {}) {
			signal?.throwIfAborted();
			const ref = await call("images/original", {
				sessionId,
				attachmentId
			}, signal);
			if (ref?.attachmentId !== attachmentId || ref?.mediaType !== "image/png" || !Number.isSafeInteger(ref.bytes) || ref.bytes < 24 || ref.bytes > MAX_BYTES || !/^[0-9a-f]{64}$/u.test(ref.sha256) || typeof ref.assetId !== "string") throw new Error("Original image metadata is invalid");
			signal?.throwIfAborted();
			const data = new Uint8Array(ref.bytes);
			let offset = 0;
			while (offset < data.length) {
				signal?.throwIfAborted();
				const chunk = await call("images/original/chunk", {
					sessionId,
					attachmentId,
					assetId: ref.assetId,
					offset
				}, signal);
				signal?.throwIfAborted();
				if (chunk?.attachmentId !== attachmentId || chunk.assetId !== ref.assetId || chunk.offset !== offset || chunk.totalBytes !== ref.bytes || typeof chunk.encoded !== "string" || chunk.encoded.length === 0 || chunk.encoded.length > Math.ceil(CHUNK_BYTES / 3) * 4 || typeof chunk.done !== "boolean") throw new Error("Original image chunk is invalid");
				const decoded = atob(chunk.encoded);
				if (decoded.length === 0 || decoded.length > CHUNK_BYTES || offset + decoded.length > data.length) throw new Error("Original image chunk is invalid");
				for (let index = 0; index < decoded.length; index += 1) data[offset + index] = decoded.charCodeAt(index);
				offset += decoded.length;
				if (chunk.done !== (offset === data.length)) throw new Error("Original image transfer is incomplete");
				onProgress?.(Math.floor(offset / data.length * 100));
			}
			const digest = await crypto.subtle.digest("SHA-256", data);
			signal?.throwIfAborted();
			if ([...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("") !== ref.sha256) throw new Error("Original image integrity check failed");
			return data;
		}
		async function saveOriginalImage(read, attachment, { signal, onProgress } = {}) {
			const name = imageDownloadName(attachment);
			let destination;
			if (typeof window.showSaveFilePicker === "function") try {
				destination = await window.showSaveFilePicker({
					suggestedName: name,
					excludeAcceptAllOption: true,
					types: [{
						description: "PNG",
						accept: { "image/png": [".png"] }
					}]
				});
			} catch (error) {
				if (error?.name !== "NotSupportedError") throw error;
			}
			signal?.throwIfAborted();
			const data = await read({
				signal,
				onProgress
			});
			signal?.throwIfAborted();
			if (destination !== void 0) {
				const stream = await destination.createWritable();
				try {
					signal?.throwIfAborted();
					await stream.write(data);
					signal?.throwIfAborted();
					await stream.close();
				} catch (error) {
					await stream.abort().catch(() => void 0);
					throw error;
				}
				return;
			}
			const url = URL.createObjectURL(new Blob([data], { type: "image/png" }));
			const anchor = document.createElement("a");
			anchor.href = url;
			anchor.download = name;
			document.body.append(anchor);
			try {
				anchor.click();
			} finally {
				anchor.remove();
				window.setTimeout(() => URL.revokeObjectURL(url), 6e4);
			}
		}
		/** One plugin-owned overlay; independent of optional host image viewers. */
		function createImageViewer() {
			let image;
			let revision = 0;
			const listeners = /* @__PURE__ */ new Set();
			const publish = (value) => {
				image = value;
				for (const listener of [...listeners]) listener();
			};
			return {
				getSnapshot: () => image,
				subscribe(listener) {
					listeners.add(listener);
					return () => listeners.delete(listener);
				},
				open: (request) => publish({
					...request,
					revision: ++revision
				}),
				close: () => publish(void 0),
				dispose() {
					publish(void 0);
					listeners.clear();
				}
			};
		}
		function ImageDialog({ image, viewer, t }) {
			const dialog = react.useRef(null);
			const close = react.useRef(null);
			const download = react.useRef();
			const [busy, setBusy] = react.useState(false);
			const [progress, setProgress] = react.useState(0);
			const [error, setError] = react.useState(false);
			react.useEffect(() => {
				const overflow = document.body.style.overflow;
				document.body.style.overflow = "hidden";
				close.current?.focus();
				const onKey = (event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						event.stopPropagation();
						viewer.close();
					}
					if (event.key === "Tab") {
						const buttons = [...dialog.current?.querySelectorAll("button:not(:disabled),[tabindex=\"0\"]") ?? []];
						const first = buttons[0], last = buttons.at(-1);
						if (event.shiftKey && document.activeElement === first) {
							event.preventDefault();
							last?.focus();
						} else if (!event.shiftKey && document.activeElement === last) {
							event.preventDefault();
							first?.focus();
						}
					}
				};
				document.addEventListener("keydown", onKey, true);
				return () => {
					download.current?.abort();
					document.body.style.overflow = overflow;
					document.removeEventListener("keydown", onKey, true);
					if (image.opener?.isConnected !== false) image.opener?.focus?.();
				};
			}, [image, viewer]);
			const save = async () => {
				if (download.current !== void 0) return;
				const controller = new AbortController();
				download.current = controller;
				setBusy(true);
				setError(false);
				setProgress(0);
				try {
					await saveOriginalImage(image.readOriginal, image.attachment, {
						signal: controller.signal,
						onProgress: (value) => {
							if (!controller.signal.aborted) setProgress(value);
						}
					});
				} catch (failure) {
					if (!controller.signal.aborted && failure?.name !== "AbortError") setError(true);
				} finally {
					if (!controller.signal.aborted) {
						download.current = void 0;
						setBusy(false);
					}
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "apc-image-backdrop",
				onClick: (event) => {
					if (event.target.closest("img, button, [role=\"alert\"]") === null) viewer.close();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "apc-image-viewer",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("imagesViewerTitle"),
					ref: dialog,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "apc-image-viewer-toolbar",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "apc-image-viewer-name",
									children: image.attachment.name ?? t("imagesTitle")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
									type: "button",
									className: "apc-image-viewer-button",
									disabled: busy,
									onClick: save,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										width: "16",
										height: "16",
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "currentColor",
										strokeWidth: "1.8",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" })
									}), busy ? `${t("imagesDownloadPreparing")} ${progress}%` : t("imagesDownloadOriginal")]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									ref: close,
									type: "button",
									className: "apc-image-viewer-button apc-image-viewer-close",
									title: t("imagesClosePreview"),
									"aria-label": t("imagesClosePreview"),
									onClick: () => viewer.close(),
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
										width: "20",
										height: "20",
										viewBox: "0 0 24 24",
										fill: "none",
										stroke: "currentColor",
										strokeWidth: "1.8",
										"aria-hidden": "true",
										children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "m6 6 12 12M18 6 6 18" })
									})
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "apc-image-viewer-canvas",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
								src: image.src,
								alt: image.attachment.name ?? t("imagesTitle")
							})
						}),
						error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-image-viewer-error",
							role: "alert",
							children: t("imagesDownloadFailed")
						})
					]
				})
			});
		}
		function ApophisCodeImageViewer({ viewer, t }) {
			const image = react.useSyncExternalStore(viewer.subscribe, viewer.getSnapshot);
			return image === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageDialog, {
				image,
				viewer,
				t
			}, image.revision);
		}
		/**
		* Renaming a stored key, the same way in the conversation and image key
		* cards: the name becomes a text field; Enter or Save stores it, Escape or
		* Cancel keeps the old one. Only the key's id and the new label reach the host.
		*
		* @module dsh-apophiscode-api/client-key-rename
		*/
		/**
		* The rename state a key card keeps.
		* @param save - `({ id, label }) => Promise`; the field closes once it settles.
		* @returns `{ renaming, start, change, cancel, submit }`.
		*/
		function useKeyRename(save) {
			const [renaming, setRenaming] = react.useState();
			return {
				renaming,
				start: (entry) => setRenaming({
					id: entry.id,
					label: entry.label
				}),
				change: (label) => setRenaming((current) => ({
					...current,
					label
				})),
				cancel: () => setRenaming(void 0),
				submit: () => {
					if (renaming === void 0 || renaming.label.trim() === "") return;
					save({
						id: renaming.id,
						label: renaming.label
					}).then(() => setRenaming(void 0));
				}
			};
		}
		/** The field and buttons that stand in for a key's name while it is renamed. */
		function KeyRenameForm({ rename, busy, t }) {
			const label = rename.renaming.label;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
				className: "apc-form",
				onSubmit: (event) => {
					event.preventDefault();
					rename.submit();
				},
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
						className: "apc-input",
						type: "text",
						maxLength: 60,
						autoFocus: true,
						placeholder: t("keyRenamePlaceholder"),
						value: label,
						onChange: (event) => rename.change(event.target.value),
						onKeyDown: (event) => event.key === "Escape" && rename.cancel()
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "submit",
						className: "apc-btn",
						"data-variant": "primary",
						disabled: busy || label.trim() === "",
						children: t("keyRenameSave")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: "apc-btn",
						"data-variant": "ghost",
						onClick: rename.cancel,
						children: t("keyRenameCancel")
					})
				]
			});
		}
		const imageModelLabel = (id) => id;
		/** Only projections come back from the host; the password draft is cleared on success. */
		function ApophisCodeImagesCard({ call, t }) {
			const [state, setState] = react.useState();
			const [draft, setDraft] = react.useState({
				key: "",
				label: ""
			});
			const [busy, setBusy] = react.useState(false);
			const [error, setError] = react.useState();
			const [balance, setBalance] = react.useState();
			const [balanceError, setBalanceError] = react.useState();
			const [balanceLoading, setBalanceLoading] = react.useState(true);
			const balanceGeneration = react.useRef(0);
			const mounted = react.useRef(false);
			const readBalance = async (force = false) => {
				if (!mounted.current) return;
				const generation = ++balanceGeneration.current;
				setBalanceLoading(true);
				setBalanceError(void 0);
				try {
					const value = await call("images/balance", { force });
					if (mounted.current && balanceGeneration.current === generation) setBalance(value);
				} catch (failure) {
					if (mounted.current && balanceGeneration.current === generation) setBalanceError(String(failure?.message ?? t("imagesBalanceFailed")).slice(0, 200));
				} finally {
					if (mounted.current && balanceGeneration.current === generation) setBalanceLoading(false);
				}
			};
			react.useEffect(() => {
				mounted.current = true;
				call("images/status").then((value) => {
					if (mounted.current) setState(value);
				}).catch(() => {
					if (mounted.current) setError(t("imagesLoadFailed"));
				});
				readBalance();
				const timer = window.setInterval(() => {
					readBalance();
				}, 6e4);
				return () => {
					mounted.current = false;
					balanceGeneration.current += 1;
					window.clearInterval(timer);
				};
			}, [call, t]);
			const mutate = async (endpoint, payload = {}) => {
				setBusy(true);
				setError(void 0);
				try {
					const value = await call(endpoint, payload);
					if (mounted.current) setState(value);
					if (mounted.current && endpoint.startsWith("images/keys/")) {
						setBalance(void 0);
						readBalance(true);
					}
					window.dispatchEvent(new Event("apophiscode-images-updated"));
					return true;
				} catch (failure) {
					if (mounted.current) setError(String(failure?.message ?? t("imagesLoadFailed")).slice(0, 200));
					return false;
				} finally {
					if (mounted.current) setBusy(false);
				}
			};
			const rename = useKeyRename(({ id, label }) => mutate("images/keys/rename", {
				id,
				label
			}));
			const disabled = busy || state?.writable !== true;
			const models = state?.models ?? [];
			const qualities = [.../* @__PURE__ */ new Set([...models.find((model) => model.id === state?.imageModel)?.qualities ?? ["auto"], state?.imageQuality ?? "auto"])];
			const rows = (state?.keys ?? []).map((entry) => balance?.keys?.find((row) => row.id === entry.id) ?? { id: entry.id });
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "apc-card",
				children: [
					state?.modelError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						role: "alert",
						children: state.modelError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: "apc-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: "apc-title",
							children: t("imagesTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "apc-actions",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "apc-btn",
								type: "button",
								disabled: busy || balanceLoading,
								onClick: () => {
									readBalance(true);
								},
								children: balanceLoading ? t("refreshing") : t("refresh")
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						children: t("imagesIntro")
					}),
					state !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "apc-setting",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-label",
								children: t("imagesEnabled")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: "apc-input apc-image-choice",
								value: String(state.imageEnabled),
								disabled,
								onChange: (event) => {
									mutate("images/update", { imageEnabled: event.target.value === "true" });
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "true",
									children: t("imagesOn")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "false",
									children: t("imagesOff")
								})]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "apc-setting",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-label",
								children: t("imagesModel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: "apc-input apc-image-choice",
								value: state.imageModel,
								disabled: disabled || !state.imageEnabled,
								onChange: (event) => {
									mutate("images/update", { imageModel: event.target.value });
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("imagesModelDefault")
								}), models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: model.id,
									children: imageModelLabel(model.id)
								}, model.id))]
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: "apc-setting",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-label",
								children: t("imagesQuality")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								className: "apc-input apc-image-choice",
								value: state.imageQuality,
								disabled: disabled || !state.imageEnabled,
								onChange: (event) => {
									mutate("images/update", { imageQuality: event.target.value });
								},
								children: qualities.map((quality) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: quality,
									children: t(`imagesQuality_${quality}`)
								}, quality))
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: t("imagesQualityHint")
						}),
						(state.keys ?? []).length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: balanceLoading ? t("imagesBalanceLoading") : t("imagesBalanceHint")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "apc-list",
							children: (state.keys ?? []).map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "apc-row",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: "apc-row-top",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "apc-row-name",
										children: [rename.renaming?.id === entry.id ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyRenameForm, {
											rename,
											busy,
											t
										}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "apc-name",
											children: entry.label
										}), entry.active && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "apc-chip",
											"data-tone": "success",
											children: t("keyActive")
										})]
									}), rename.renaming?.id !== entry.id && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
										className: "apc-actions",
										children: [
											!entry.active && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: "apc-btn",
												type: "button",
												disabled: busy,
												onClick: () => {
													mutate("images/keys/select", { id: entry.id });
												},
												children: t("keyUse")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: "apc-btn",
												"data-variant": "ghost",
												type: "button",
												disabled: busy,
												onClick: () => rename.start(entry),
												children: t("keyRename")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												className: "apc-btn",
												"data-variant": "danger",
												type: "button",
												disabled: busy,
												onClick: () => {
													mutate("images/keys/remove", { id: entry.id });
												},
												children: t("keyRemove")
											})
										]
									})]
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyBalance, {
									row: rows.find((row) => row.id === entry.id),
									t
								})]
							}, entry.id))
						}),
						(state.keys ?? []).length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: t("imagesNoKey")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
							className: "apc-add",
							onSubmit: (event) => {
								event.preventDefault();
								if (busy || draft.key.trim() === "") return;
								mutate("images/keys/add", draft).then((saved) => {
									if (saved && mounted.current) setDraft({
										key: "",
										label: ""
									});
								});
							},
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-label",
								children: t("imagesAddKey")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "apc-form",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: "apc-input",
										type: "password",
										autoComplete: "off",
										"aria-label": t("imagesAddKey"),
										placeholder: t("imagesKeyPlaceholder"),
										value: draft.key,
										disabled: busy,
										onChange: (event) => setDraft((current) => ({
											...current,
											key: event.target.value
										}))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: "apc-input",
										type: "text",
										maxLength: 60,
										"aria-label": t("addLabelPlaceholder"),
										placeholder: t("addLabelPlaceholder"),
										value: draft.label,
										disabled: busy,
										onChange: (event) => setDraft((current) => ({
											...current,
											label: event.target.value
										}))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										className: "apc-btn",
										"data-variant": "primary",
										"data-size": "md",
										type: "submit",
										disabled: busy || draft.key.trim() === "",
										children: t("add")
									})
								]
							})]
						}),
						!state.available && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: t("imagesUnavailable")
						}),
						!state.writable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: t("searchNotWritable")
						})
					] }),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						role: "alert",
						children: error
					}),
					balanceError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						role: "alert",
						children: `${t("imagesBalanceFailed")}: ${balanceError}`
					})
				]
			});
		}
		/** A draft shortcut names this provider explicitly when other image tools exist. */
		function ApophisCodeImageShortcut({ call, t, directory, prepare }) {
			const active = react.useSyncExternalStore((listener) => directory.subscribe(listener), () => directory.getSnapshot())?.current?.provider === "apophiscode";
			const [ready, setReady] = react.useState(false);
			const [error, setError] = react.useState();
			react.useEffect(() => {
				let live = true;
				let generation = 0;
				const refresh = () => {
					if (!active) return;
					const current = ++generation;
					call("images/status").then((value) => {
						if (live && current === generation) setReady(value.imageEnabled && value.available && value.keys.some((key) => !key.disabled));
					}).catch(() => {
						if (live && current === generation) setReady(false);
					});
				};
				setReady(false);
				refresh();
				window.addEventListener("apophiscode-images-updated", refresh);
				return () => {
					live = false;
					window.removeEventListener("apophiscode-images-updated", refresh);
				};
			}, [call, active]);
			if (!active || !ready) return null;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: "apc-image-shortcut",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						className: "apc-btn",
						type: "button",
						title: t("imagesShortcutHint"),
						onClick: () => {
							try {
								prepare(t("imagesDraft"));
								setError(void 0);
							} catch {
								setError(t("imagesDraftBusy"));
							}
						},
						children: t("imagesCreate")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImageShortcutBalance, {
						call,
						t
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "apc-error",
						role: "alert",
						children: error
					})
				]
			});
		}
		function GeneratedImage({ attachment, loadImage, openImage, t }) {
			const [url, setUrl] = react.useState();
			const [failed, setFailed] = react.useState(false);
			const [attempt, setAttempt] = react.useState(0);
			react.useEffect(() => {
				let live = true;
				setUrl(void 0);
				setFailed(false);
				Promise.resolve().then(() => loadImage(attachment)).then((value) => {
					if (live) setUrl(value);
				}, () => {
					if (live) setFailed(true);
				});
				return () => {
					live = false;
				};
			}, [
				attachment,
				loadImage,
				attempt
			]);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				className: "apc-generated-image",
				type: "button",
				title: t("imagesOpen"),
				"aria-label": t("imagesOpen"),
				disabled: !url && !failed,
				onClick: (event) => {
					if (failed) {
						setAttempt((value) => value + 1);
						return;
					}
					openImage(url, attachment, event.currentTarget);
				},
				children: url ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
					src: url,
					alt: attachment.name ?? t("imagesTitle")
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: failed ? t("imagesRetryPreview") : t("imagesLoadingPreview") })
			});
		}
		function ApophisCodeImageResult({ block, t, loadImage, openImage }) {
			const settled = block?.kind === "tool-result";
			const failed = settled && block.isError === true;
			const images = settled ? (block.content ?? []).filter((part) => part.type === "image" && part.attachment) : [];
			const error = failed ? block.content?.find((part) => part.type === "text")?.text : void 0;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "apc-image-result",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "apc-status",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: t("imagesTitle") }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "apc-meta",
							children: ["ApophisCode · ", t(!settled ? "imagesGenerating" : failed ? "imagesFailed" : "imagesDone")]
						})]
					}),
					images.map((part) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(GeneratedImage, {
						attachment: part.attachment,
						t,
						loadImage,
						openImage
					}, part.attachment.attachmentId)),
					typeof block?.meta?.requestedModel === "string" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "apc-meta",
						children: [
							block.meta.requestedModel,
							" · ",
							String(block.meta.requestedQuality ?? "auto"),
							" · ",
							block.meta.width,
							" × ",
							block.meta.height
						]
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						role: "alert",
						children: error
					})
				]
			});
		}
		function ImageChatOutput({ node, ...props }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "apc-image-chat",
				children: node.data.blocks.map((block) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ApophisCodeImageResult, {
					block,
					...props
				}, block.toolCallId))
			});
		}
		function installImagePresentation(ctx, t, call) {
			ctx.inject(["uiConversation"], (scope) => {
				const conversation = scope.get("uiConversation");
				if (typeof conversation?.events?.register !== "function" || typeof conversation?.imageUrl !== "function") return;
				const viewer = createImageViewer();
				scope.effect(() => () => viewer.dispose(), "apophiscode-api: image viewer");
				scope.slots.inject("shell.overlay", () => scope.slots.register({
					name: "shell.overlay",
					id: "apophiscode-image-viewer",
					order: 21,
					inject: () => ({
						viewer,
						t
					})
				}, ApophisCodeImageViewer));
				const imageProps = (sessionId) => ({
					t,
					loadImage: (attachment) => conversation.imageUrl(sessionId, attachment),
					openImage: (src, attachment, opener) => {
						viewer.open({
							src,
							attachment,
							opener,
							readOriginal: (options) => readOriginalImage(call, sessionId, attachment.attachmentId, options)
						});
					}
				});
				scope.effect(() => conversation.events.register(imageConversationNode), "apophiscode-api: image results in chat");
				scope.slots.inject("conversation.chat.node", () => scope.slots.register({
					name: "conversation.chat.node",
					key: IMAGE_CHAT_KIND,
					inject: imageProps
				}, ImageChatOutput));
				scope.slots.inject("tool.call.toolview", () => scope.slots.register({
					name: "tool.call.toolview",
					key: "apophiscode_image_generate",
					inject: imageProps
				}, ApophisCodeImageResult));
			});
		}
		/**
		* The settings card that turns one session into a numbers-only diagnosis a
		* user can copy into a bug report. The host builds the text; this card only
		* picks the session, shows the result and copies it.
		*
		* @module dsh-apophiscode-api/client-diagnostics
		*/
		const pad = (value) => String(value).padStart(2, "0");
		/** The picker's local date and time; the report itself keeps UTC ISO times. */
		function localTime(iso) {
			const date = new Date(iso);
			if (Number.isNaN(date.getTime())) return "—";
			return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
		}
		const messageOf = (failure) => failure instanceof Error ? failure.message : String(failure);
		function DiagnosticsCard({ call, t }) {
			const [sessions, setSessions] = react.useState();
			const [selected, setSelected] = react.useState("");
			const [report, setReport] = react.useState();
			const [busy, setBusy] = react.useState(false);
			const [error, setError] = react.useState();
			const [copied, setCopied] = react.useState();
			const area = react.useRef(null);
			const mounted = react.useRef(true);
			react.useEffect(() => () => {
				mounted.current = false;
			}, []);
			const loadSessions = react.useCallback(() => {
				setError(void 0);
				return call("diagnostics/sessions").then((value) => {
					if (!mounted.current) return;
					const list = Array.isArray(value?.sessions) ? value.sessions : [];
					setSessions(list);
					setSelected((current) => list.some((item) => item.id === current) ? current : list[0]?.id ?? "");
				}).catch((failure) => {
					if (mounted.current) setError(messageOf(failure));
				});
			}, [call]);
			react.useEffect(() => {
				loadSessions();
			}, [loadSessions]);
			const generate = () => {
				if (selected === "") return;
				setBusy(true);
				setError(void 0);
				setCopied(void 0);
				call("diagnostics/session", { sessionId: selected }).then((value) => {
					if (mounted.current) setReport(JSON.stringify(value, null, 2));
				}).catch((failure) => {
					if (mounted.current) setError(messageOf(failure));
				}).finally(() => {
					if (mounted.current) setBusy(false);
				});
			};
			/** Copy through the clipboard API, or select everything for a manual copy. */
			const copy = () => {
				if (report === void 0) return;
				const selectAll = () => {
					area.current?.focus?.();
					area.current?.select?.();
					if (mounted.current) setCopied("selected");
				};
				const clipboard = globalThis.navigator?.clipboard;
				if (typeof clipboard?.writeText !== "function") {
					selectAll();
					return;
				}
				clipboard.writeText(report).then(() => {
					if (mounted.current) setCopied("copied");
				}, selectAll);
			};
			const label = (item) => [
				localTime(item.createdAt),
				item.folder ?? t("diagNoFolder"),
				item.live ? t("diagLive") : void 0
			].filter(Boolean).join(" · ");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "apc-card",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
						className: "apc-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: "apc-title",
							children: t("diagTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "apc-actions",
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "apc-btn",
								type: "button",
								disabled: busy,
								onClick: () => {
									loadSessions();
								},
								children: t("refresh")
							})
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						children: t("diagIntro")
					}),
					sessions !== void 0 && sessions.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						children: t("diagNoSessions")
					}),
					sessions !== void 0 && sessions.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "apc-form",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
							className: "apc-input apc-diag-session",
							"aria-label": t("diagSession"),
							value: selected,
							disabled: busy,
							onChange: (event) => {
								setSelected(event.target.value);
								setReport(void 0);
								setCopied(void 0);
							},
							children: sessions.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
								value: item.id,
								children: label(item)
							}, item.id))
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							className: "apc-btn",
							"data-variant": "primary",
							"data-size": "md",
							type: "button",
							disabled: busy || selected === "",
							onClick: generate,
							children: busy ? t("diagGenerating") : t("diagGenerate")
						})]
					}),
					report !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
							ref: area,
							className: "apc-input apc-mono apc-diag-text",
							readOnly: true,
							rows: 14,
							value: report,
							"aria-label": t("diagReport")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "apc-form",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								className: "apc-btn",
								type: "button",
								onClick: copy,
								children: copied === "copied" ? t("diagCopied") : t("diagCopy")
							}), copied === "selected" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-note",
								children: t("diagSelected")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: t("diagPrivacy")
						})
					] }),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						role: "alert",
						children: `${t("diagError")}: ${error}`
					})
				]
			});
		}
		/**
		* Browser half: the ApophisCode settings page and the composer balance chip.
		*
		* Every number here comes from the host over the plugin's own loopback RPC
		* channel; no key material crosses it, and each read is a bounded projection
		* the host built.
		*
		* @module dsh-apophiscode-api/client
		*/
		const NS = "settings.apophisCodeApi";
		const PROVIDER = "apophiscode";
		const CHANNEL = "/apophiscode-api";
		const REFRESH_MS = 6e4;
		/** Open the configured service's public site when a user needs an API key. */
		const INVITE_URL = "https://www.apophis.uk/";
		/** How long after a search change the panel re-reads what DSH applied (the patch hot-reloads). */
		const SEARCH_SETTLE_MS = 1500;
		/** While the CLI installs, the panel polls its status this often. */
		const INSTALL_POLL_MS = 2e3;
		const OWN_SEARCH_IDS = {
			auto: "apophiscode-api-auto",
			apophiscode: "apophiscode-api"
		};
		const FOREIGN_NAMES = {
			codex: "Codex",
			kimi: "Kimi"
		};
		/**
		* The one way this bundle talks to the host. The transport drops an
		* `undefined` payload and the channel's envelope requires the field, so every
		* call carries an object.
		*/
		function channelCaller(rpc) {
			return (endpoint, payload = {}, signal) => rpc.call(CHANNEL, endpoint, payload, signal).then((response) => {
				if (!response?.ok) throw new Error(response?.error?.message ?? "ApophisCode RPC failed");
				return response.value;
			});
		}
		const useCaller = (rpc) => react.useMemo(() => channelCaller(rpc), [rpc]);
		function clearMessage(error) {
			const text = typeof error?.message === "string" && error.message.length > 0 ? error.message : String(error);
			return text.length > 200 ? text.slice(0, 200) : text;
		}
		/** Active key's usage row, preferring the key the ring currently points at. */
		function activeUsage(balance) {
			if (balance === void 0) return void 0;
			return balance.keys?.find((entry) => entry.id === balance.activeId) ?? balance.keys?.[0];
		}
		function Card({ title, aside, children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
				className: "apc-card",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("header", {
					className: "apc-head",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
						className: "apc-title",
						children: title
					}), aside]
				}), children]
			});
		}
		function Button({ variant, size, children, ...rest }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				className: "apc-btn",
				"data-variant": variant,
				"data-size": size,
				...rest,
				children
			});
		}
		function Segmented({ label, options, value, disabled, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "apc-seg",
				role: "radiogroup",
				"aria-label": label,
				children: options.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					role: "radio",
					"aria-checked": value === option.value,
					disabled,
					onClick: () => value !== option.value && onChange(option.value),
					children: option.label
				}, option.value))
			});
		}
		function KeyRow({ entry, row, busy, rename, onAction, t }) {
			const editing = rename.renaming?.id === entry.id;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "apc-row",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "apc-row-top",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "apc-row-name",
						children: [
							editing ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyRenameForm, {
								rename,
								busy,
								t
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-name",
								children: entry.label
							}),
							entry.active && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-chip",
								"data-tone": "success",
								children: t("keyActive")
							}),
							entry.disabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-chip",
								"data-tone": "danger",
								children: entry.disabledReason ? `${t("keyDisabled")} · ${entry.disabledReason}` : t("keyDisabled")
							})
						]
					}), !editing && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						className: "apc-actions",
						children: [
							!entry.active && !entry.disabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: busy,
								onClick: () => onAction("keys/select", { id: entry.id }),
								children: t("keyUse")
							}),
							entry.disabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: busy,
								onClick: () => onAction("keys/enable", { id: entry.id }),
								children: t("keyEnable")
							}),
							!entry.disabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								disabled: busy,
								onClick: () => onAction("keys/disable", { id: entry.id }),
								children: t("keyDisable")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								disabled: busy,
								onClick: () => rename.start(entry),
								children: t("keyRename")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								variant: "danger",
								disabled: busy,
								onClick: () => onAction("keys/remove", { id: entry.id }),
								children: t("keyRemove")
							})
						]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyBalance, {
					row,
					t
				})]
			});
		}
		/**
		* Where to get a key, for a profile that has none. A new-window link: the
		* desktop shell hands http(s) window opens to the system browser, and a web
		* profile opens a new tab.
		*/
		function RegisterInvite({ t }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: "apc-note",
				children: [
					t("inviteLead"),
					" ",
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
						className: "apc-link",
						href: INVITE_URL,
						target: "_blank",
						rel: "noopener noreferrer",
						children: t("inviteLink")
					})
				]
			});
		}
		function AccountsCard({ call, t, onModelsChanged }) {
			const [status, setStatus] = react.useState();
			const [balance, setBalance] = react.useState();
			const [balanceError, setBalanceError] = react.useState();
			const [busy, setBusy] = react.useState(false);
			const [refreshing, setRefreshing] = react.useState(false);
			const [error, setError] = react.useState();
			const [draft, setDraft] = react.useState({
				key: "",
				label: ""
			});
			const generation = react.useRef(0);
			const load = react.useCallback((force = false) => {
				const current = ++generation.current;
				setBusy(true);
				setRefreshing(true);
				setError(void 0);
				setBalanceError(void 0);
				const refreshModels = force ? call("models/status", { force: true }).catch((failure) => {
					if (generation.current === current) setError({
						kind: "read",
						message: clearMessage(failure)
					});
				}).finally(() => {
					if (generation.current === current) onModelsChanged();
				}) : void 0;
				const readStatus = call("status").then((nextStatus) => {
					if (generation.current === current) setStatus(nextStatus);
				}).catch((failure) => {
					if (generation.current === current) setError({
						kind: "read",
						message: clearMessage(failure)
					});
				}).finally(() => {
					if (generation.current === current) setBusy(false);
				});
				const readBalance = call("balance", { force }).then((nextBalance) => {
					if (generation.current === current) setBalance(nextBalance);
				}).catch((failure) => {
					if (generation.current === current) setBalanceError(clearMessage(failure));
				});
				return Promise.all([
					readStatus,
					readBalance,
					refreshModels
				]).finally(() => {
					if (generation.current === current) setRefreshing(false);
				});
			}, [call, onModelsChanged]);
			react.useEffect(() => {
				load(false);
				return () => {
					generation.current += 1;
				};
			}, [load]);
			/** A refused change says so; a balance read after a stored change is a read. */
			const mutate = (endpoint, payload) => {
				const current = ++generation.current;
				setBusy(true);
				setRefreshing(false);
				setError(void 0);
				setBalanceError(void 0);
				return call(endpoint, payload).then((nextStatus) => {
					if (generation.current !== current) return;
					setStatus(nextStatus);
					if (endpoint !== "keys/rename") onModelsChanged();
					setRefreshing(true);
					call("balance", { force: true }).then((nextBalance) => {
						if (generation.current === current) setBalance(nextBalance);
					}, (failure) => {
						if (generation.current === current) setBalanceError(clearMessage(failure));
					}).finally(() => {
						if (generation.current === current) setRefreshing(false);
					});
				}, (failure) => {
					if (generation.current === current) setError({
						kind: "save",
						message: clearMessage(failure)
					});
				}).finally(() => {
					if (generation.current === current) setBusy(false);
				});
			};
			const addKey = (event) => {
				event.preventDefault();
				if (draft.key.trim() === "") return;
				mutate("keys/add", {
					key: draft.key,
					label: draft.label
				}).then(() => setDraft({
					key: "",
					label: ""
				}));
			};
			const rename = useKeyRename(({ id, label }) => mutate("keys/rename", {
				id,
				label
			}));
			const keys = status?.keys ?? [];
			const rows = balance?.keys ?? [];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: t("accountsTitle"),
				aside: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "apc-actions",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						disabled: busy || refreshing,
						onClick: () => load(true),
						children: busy || refreshing ? t("refreshing") : t("refresh")
					}), keys.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						variant: "danger",
						disabled: busy,
						onClick: () => mutate("keys/remove-all", {}),
						children: t("removeAll")
					})]
				}),
				children: [
					keys.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						children: t("empty")
					}), status !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RegisterInvite, { t })] }) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "apc-list",
						children: keys.map((entry) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KeyRow, {
							entry,
							row: rows.find((row) => row.id === entry.id),
							busy,
							rename,
							onAction: mutate,
							t
						}, entry.id))
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						children: t("keysHint")
					})] }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("form", {
						className: "apc-add",
						onSubmit: addKey,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "apc-label",
							children: t("addTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "apc-form",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "apc-input",
									type: "password",
									autoComplete: "off",
									placeholder: t("addKeyPlaceholder"),
									value: draft.key,
									onChange: (event) => setDraft((current) => ({
										...current,
										key: event.target.value
									}))
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "apc-input",
									type: "text",
									placeholder: t("addLabelPlaceholder"),
									value: draft.label,
									onChange: (event) => setDraft((current) => ({
										...current,
										label: event.target.value
									}))
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									type: "submit",
									variant: "primary",
									size: "md",
									disabled: busy || draft.key.trim() === "",
									children: t("add")
								})
							]
						})]
					}),
					status !== void 0 && status.writable !== true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						children: t("notWritable")
					}),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						role: "alert",
						children: `${t(error.kind === "save" ? "saveError" : "error")}: ${error.message}`
					}),
					balanceError !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-warn",
						role: "status",
						children: `${t("balanceUnavailable")}：${balanceFailureCopy(balanceError, t)}`
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: "apc-advanced",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", { children: t("advanced") }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "apc-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "apc-label",
									children: t("apiHost")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "apc-input",
									type: "text",
									disabled: status?.writable !== true,
									defaultValue: status?.hosts?.apiHost ?? "",
									onBlur: (event) => mutate("hosts/update", {
										apiHost: event.target.value,
										statusHost: status?.hosts?.statusHost
									})
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "apc-field",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "apc-label",
									children: t("statusHost")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									className: "apc-input",
									type: "text",
									disabled: status?.writable !== true,
									defaultValue: status?.hosts?.statusHost ?? "",
									onBlur: (event) => mutate("hosts/update", {
										statusHost: event.target.value,
										apiHost: status?.hosts?.apiHost
									})
								})]
							})
						]
					})
				]
			});
		}
		function ModelsCard({ call, t }) {
			const [state, setState] = react.useState();
			const [busy, setBusy] = react.useState(false);
			const [error, setError] = react.useState();
			react.useEffect(() => {
				let live = true;
				call("models/status").then((value) => {
					if (live) setState(value);
				}).catch((failure) => {
					if (live) setError(clearMessage(failure));
				});
				return () => {
					live = false;
				};
			}, [call]);
			const models = state?.models ?? [];
			const selectedIds = models.filter((model) => model.selected).map((model) => model.id);
			const disabled = busy || state?.writable !== true;
			const update = (ids) => {
				if (disabled) return;
				setBusy(true);
				setError(void 0);
				call("models/update", { selectedIds: ids }).then(setState).catch((failure) => setError(clearMessage(failure))).finally(() => setBusy(false));
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: t("modelsTitle"),
				aside: state !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "apc-meta",
					children: fill(t("modelsCount"), {
						count: selectedIds.length,
						total: models.length
					})
				}),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						children: t("modelsIntro")
					}),
					state === void 0 && error === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						role: "status",
						children: t("modelsChecking")
					}),
					state !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "apc-actions",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: disabled || selectedIds.length === models.length,
								onClick: () => update(models.map((model) => model.id)),
								children: t("modelsAll")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								disabled: disabled || selectedIds.length === 0,
								onClick: () => update([]),
								children: t("modelsNone")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("fieldset", {
							className: "apc-models",
							"aria-label": t("modelsTitle"),
							disabled,
							children: models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
								className: "apc-model",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: model.selected,
									onChange: (event) => update(event.target.checked ? [...selectedIds, model.id] : selectedIds.filter((id) => id !== model.id))
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: model.name }),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "apc-meta apc-mono",
										children: model.id
									}),
									model.unavailableReason && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "apc-error",
										children: model.unavailableReason
									})
								] })]
							}, model.id))
						}),
						selectedIds.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: t("modelsEmpty")
						}),
						state.writable !== true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: t("searchNotWritable")
						})
					] }),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						role: "alert",
						children: `${t("modelsFailed")}: ${error}`
					})
				]
			});
		}
		/** Web search routing and backend, written through the host. */
		function SearchCard({ call, t }) {
			const [state, setState] = react.useState();
			const [busy, setBusy] = react.useState(false);
			const [error, setError] = react.useState();
			const generation = react.useRef(0);
			const read = react.useCallback(() => {
				const current = ++generation.current;
				return call("search/status").then((value) => {
					if (generation.current === current) setState(value);
				}).catch((failure) => {
					if (generation.current === current) setError(clearMessage(failure));
				});
			}, [call]);
			react.useEffect(() => {
				read();
				return () => {
					generation.current += 1;
				};
			}, [read]);
			const update = (patch) => {
				if (busy || state?.writable !== true) return;
				setBusy(true);
				setError(void 0);
				call("search/update", patch).then((value) => {
					setState(value);
					window.setTimeout(() => {
						read();
					}, SEARCH_SETTLE_MS);
				}).catch((failure) => setError(clearMessage(failure))).finally(() => setBusy(false));
			};
			const mode = state?.searchProvider;
			const model = state?.searchModel;
			const models = state?.models ?? [];
			const base = state?.effective?.base;
			const runtime = state?.effective?.runtime;
			const foreign = Object.entries(state?.foreign ?? {}).filter(([, present]) => present).map(([name]) => FOREIGN_NAMES[name] ?? name);
			const expected = OWN_SEARCH_IDS[mode];
			const overridden = expected !== void 0 && state?.applied?.state === "applied" && base !== void 0 && base !== expected;
			const disabled = busy || state?.writable !== true;
			const modeHint = {
				default: "searchModeDefaultHint",
				auto: "searchModeAutoHint",
				apophiscode: "searchModeApophisCodeHint"
			}[mode];
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: t("searchTitle"),
				aside: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "apc-chip",
					"data-tone": "neutral",
					children: t("searchScope")
				}),
				children: [
					state?.modelError && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						role: "alert",
						children: state.modelError
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						children: t("searchIntro")
					}),
					state === void 0 && error === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						role: "status",
						children: t("searchChecking")
					}),
					state !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "apc-setting",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-label",
								children: t("searchModeTitle")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Segmented, {
								label: t("searchModeTitle"),
								value: mode,
								disabled,
								onChange: (value) => update({ searchProvider: value }),
								options: [
									{
										value: "default",
										label: t("searchModeDefault")
									},
									{
										value: "auto",
										label: t("searchModeAuto")
									},
									{
										value: "apophiscode",
										label: t("searchModeApophisCode")
									}
								]
							}), modeHint !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "apc-note",
								children: t(modeHint)
							})] })]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "apc-setting",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-label",
								children: t("searchModelTitle")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
								className: "apc-input",
								value: model,
								disabled,
								onChange: (event) => update({ searchModel: event.target.value }),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: "",
									children: t("searchModelDefault")
								}), models.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: row.id,
									children: row.id
								}, row.id))]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "apc-note",
								children: t("searchModelHint")
							})] })]
						}),
						state.available === true && (base !== void 0 || runtime !== void 0) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "apc-status",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-dot",
								"data-tone": overridden ? "warn" : expected !== void 0 && base === expected ? "success" : void 0
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-meta",
								children: fill(t("searchEffective"), {
									base: base ?? t("searchUnknown"),
									runtime: runtime ?? base ?? t("searchUnknown")
								})
							})]
						}),
						overridden && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-warn",
							children: fill(t("searchOverridden"), { base })
						}),
						foreign.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: fill(t("searchForeign"), { names: foreign.join(" / ") })
						}),
						state.applied?.state === "failed" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-error",
							role: "alert",
							children: fill(t("searchApplyFailed"), { error: state.applied.error ?? "" })
						}),
						state.available !== true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: t("searchUnavailable")
						}),
						state.writable !== true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: t("searchNotWritable")
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: t("searchPatchNote")
						})
					] }),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						role: "alert",
						children: `${t("searchLoadFailed")}: ${error}`
					})
				]
			});
		}
		const INSTALL_FAILURES = {
			"npm-missing": () => "cliNpmMissing",
			permission: (cli) => cli.platform === "win32" ? "cliPermissionWindows" : "cliPermission",
			network: () => "cliNetwork",
			timeout: () => "cliTimeout",
			"not-found-after-install": () => "cliNotFoundAfterInstall"
		};
		/** The sentence explaining a failed install, by the code the host classified. */
		function installFailure(cli, t) {
			const key = INSTALL_FAILURES[cli.install?.code]?.(cli);
			return key === void 0 ? void 0 : fill(t(key), { command: cli.command ?? "" });
		}
		/**
		* Which route Claude requests take, whether this device has the Claude Code
		* CLI for an explicitly selected CLI transport, and an installer if missing.
		*/
		function ClaudeCliCard({ call, t }) {
			const [cli, setCli] = react.useState();
			const [checking, setChecking] = react.useState(false);
			const [saving, setSaving] = react.useState(false);
			const [error, setError] = react.useState();
			const check = react.useCallback((force = false) => {
				setChecking(true);
				setError(void 0);
				return call("claude-cli/status", { force }).then(setCli).catch((failure) => setError(clearMessage(failure))).finally(() => setChecking(false));
			}, [call]);
			react.useEffect(() => {
				check(false);
			}, [check]);
			const running = cli?.install?.state === "running";
			react.useEffect(() => {
				if (!running) return void 0;
				let live = true;
				const timer = window.setInterval(() => {
					call("claude-cli/status").then((value) => {
						if (live) setCli(value);
					}).catch(() => void 0);
				}, INSTALL_POLL_MS);
				return () => {
					live = false;
					window.clearInterval(timer);
				};
			}, [call, running]);
			const install = () => {
				setError(void 0);
				call("claude-cli/install").then(setCli).catch((failure) => setError(clearMessage(failure)));
			};
			const choose = (transport) => {
				setSaving(true);
				setError(void 0);
				call("claude-cli/update", { transport }).then(setCli).catch((failure) => setError(`${t("cliTransportFailed")}: ${clearMessage(failure)}`)).finally(() => setSaving(false));
			};
			const usable = cli?.installed === true && cli.version !== void 0;
			const failed = cli?.install?.state === "failed";
			const failure = cli === void 0 ? void 0 : installFailure(cli, t);
			const transport = cli?.transport ?? "auto";
			const processes = cli?.processes;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: t("cliTitle"),
				aside: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					disabled: checking || running,
					onClick: () => check(true),
					children: checking ? t("refreshing") : t("cliRecheck")
				}),
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						children: t("cliIntro")
					}),
					cli !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "apc-setting",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "apc-label",
							children: t("cliTransportTitle")
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Segmented, {
								label: t("cliTransportTitle"),
								value: transport,
								disabled: saving || cli.writable !== true,
								onChange: choose,
								options: [
									{
										value: "auto",
										label: t("cliTransportAuto")
									},
									{
										value: "cli",
										label: t("cliTransportCli")
									},
									{
										value: "http",
										label: t("cliTransportHttp")
									}
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "apc-note",
								children: t({
									auto: "cliTransportAutoHint",
									cli: "cliTransportCliHint",
									http: "cliTransportHttpHint"
								}[transport] ?? "cliTransportAutoHint")
							}),
							cli.writable !== true && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "apc-note",
								children: t("cliTransportNotWritable")
							})
						] })]
					}),
					cli === void 0 && error === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						children: t("cliChecking")
					}),
					usable && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "apc-status",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "apc-dot",
									"data-tone": "success"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: t("cliInstalled") }),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: `${t("cliVersion")} ${cli.version}` })
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "apc-meta",
							children: [
								t("cliPath"),
								" ",
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "apc-mono",
									children: cli.path
								})
							]
						}),
						processes !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "apc-meta",
							children: fill(t("cliProcesses"), processes)
						}),
						cli.install?.state === "succeeded" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "apc-note",
							children: t("cliInstallSucceeded")
						})
					] }),
					cli !== void 0 && !usable && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "apc-callout",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "apc-status",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "apc-dot",
									"data-tone": cli.installed ? "danger" : "warn"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: cli.installed ? t("cliBroken") : t("cliMissing") })]
							}),
							cli.installed && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "apc-meta",
								children: [
									t("cliPath"),
									" ",
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "apc-mono",
										children: cli.path
									})
								]
							}), cli.error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
								className: "apc-detail",
								children: cli.error
							})] }),
							cli.configuredPath !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "apc-note",
								children: fill(t("cliConfiguredMissing"), { path: cli.configuredPath })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "apc-note",
								children: t("cliMissingHint")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: "apc-split",
								children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
									variant: "primary",
									size: "md",
									disabled: running || checking,
									onClick: install,
									children: running ? t("cliInstalling") : cli.installed ? t("cliReinstall") : t("cliInstall")
								})
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: "apc-note",
								children: [fill(t("cliInstallCommand"), { command: cli.command ?? "" }), cli.platform === "win32" && ` ${t("cliWindowsNote")}`]
							})
						]
					}),
					failed && !usable && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						children: failure === void 0 ? t("cliInstallFailed") : `${t("cliInstallFailed")} · ${failure}`
					}), cli.install.detail !== void 0 && cli.install.detail !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
						className: "apc-detail",
						children: cli.install.detail
					})] }),
					error !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						role: "alert",
						children: `${t("error")}: ${error}`
					})
				]
			});
		}
		/** A release-age wait can end tomorrow, so the date is part of the time. */
		function readDateTime(ms) {
			try {
				return new Date(ms).toLocaleString(void 0, {
					month: "numeric",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit"
				});
			} catch {
				return new Date(ms).toISOString().slice(0, 16).replace("T", " ");
			}
		}
		function VersionCard({ call, t }) {
			const [info, setInfo] = react.useState();
			const [loading, setLoading] = react.useState(true);
			const [error, setError] = react.useState(false);
			const [updating, setUpdating] = react.useState(false);
			const [updateFailed, setUpdateFailed] = react.useState();
			/** A version pnpm still holds back under the profile's release-age policy. */
			const [pending, setPending] = react.useState();
			const [updated, setUpdated] = react.useState();
			const [restartHint, setRestartHint] = react.useState(false);
			const generation = react.useRef(0);
			const load = (force) => {
				const current = ++generation.current;
				setLoading(true);
				setError(false);
				call("plugin/version", { force }).then((value) => {
					if (generation.current === current) setInfo(value);
				}).catch(() => {
					if (generation.current === current) setError(true);
				}).finally(() => {
					if (generation.current === current) setLoading(false);
				});
			};
			react.useEffect(() => {
				load(false);
				return () => {
					generation.current += 1;
				};
			}, []);
			const update = () => {
				setUpdating(true);
				setUpdateFailed(void 0);
				setPending(void 0);
				call("plugin/update").then((value) => {
					if (value?.pending === true) {
						setPending(value);
						return;
					}
					setUpdated(value);
					setRestartHint(false);
				}).catch((error) => setUpdateFailed(updateFailureCopy(error))).finally(() => setUpdating(false));
			};
			const installKind = info?.install?.kind;
			const showStatus = info !== void 0 && updated === void 0;
			const canUpdate = showStatus && !info.restartRequired && info.onlineUpdates !== false && info.updateAvailable && installKind === "npm";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Card, {
				title: t("versionTitle"),
				aside: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "apc-actions",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
							href: "https://github.com/ApophisCode/dsh-apophiscode-api/releases",
							target: "_blank",
							rel: "noreferrer",
							children: t("versionReleases")
						}),
						canUpdate && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							variant: "primary",
							disabled: loading || updating,
							onClick: update,
							children: updating ? t("versionUpdating") : t("versionUpdate")
						}),
						updated === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
							disabled: loading || updating,
							onClick: () => load(true),
							children: loading ? t("versionChecking") : t("versionCheck")
						})
					]
				}),
				children: [
					loading && info === void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						role: "status",
						children: t("versionChecking")
					}),
					error && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						role: "alert",
						children: t("versionFailed")
					}),
					showStatus && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "apc-status",
						role: "status",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "apc-dot",
								"data-tone": info.updateAvailable || info.restartRequired || info.published === false ? "warn" : "success"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", { children: `v${info.current}` }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
								className: "apc-meta",
								children: [info.restartRequired ? fill(t("versionInstalledPending"), { version: info.installed }) : info.onlineUpdates === false ? t("versionLocal") : info.published === false ? t("versionUnpublished") : info.updateAvailable ? fill(t("versionAvailable"), { version: info.latest }) : t("versionUpToDate"), info.updateAvailable && ` · ${t("versionLatest")} v${info.latest}`]
							})
						]
					}),
					showStatus && installKind === "link" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						children: t("versionLinked")
					}),
					showStatus && info.updateAvailable && installKind === "unknown" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						children: t("versionManual")
					}),
					updateFailed && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-error",
						role: "alert",
						children: t(updateFailed)
					}),
					pending !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-note",
						role: "status",
						children: typeof pending.availableAt === "number" ? fill(t("versionCoolingUntil"), {
							version: pending.version,
							time: readDateTime(pending.availableAt)
						}) : fill(t("versionCooling"), { version: pending.version })
					}),
					updated !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "apc-callout",
						"data-tone": "info",
						role: "status",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("b", {
								className: "apc-title",
								children: fill(t("versionUpdated"), { version: updated.version })
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "apc-note",
								children: t("versionUpdatedHint")
							}),
							restartHint && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: "apc-note",
								children: t("versionRestartHint")
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "apc-actions",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										variant: "primary",
										onClick: () => window.location.reload(),
										children: t("versionRefresh")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										onClick: () => setRestartHint(true),
										children: t("versionRestart")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
										variant: "ghost",
										onClick: () => {
											setUpdated(void 0);
											load(true);
										},
										children: t("versionLater")
									})
								]
							})
						]
					})
				]
			});
		}
		function ApophisCodeSection({ rpc, t }) {
			const call = useCaller(rpc);
			const [modelRevision, modelsChanged] = react.useReducer((revision) => revision + 1, 0);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "apc",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "apc-intro",
						children: t("intro")
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(AccountsCard, {
						call,
						t,
						onModelsChanged: modelsChanged
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ApophisCodeImagesCard, {
						call,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ClaudeCliCard, {
						call,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelsCard, {
						call,
						t
					}, `models-${modelRevision}`),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearchCard, {
						call,
						t
					}, `search-${modelRevision}`),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(VersionCard, {
						call,
						t
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DiagnosticsCard, {
						call,
						t
					})
				]
			});
		}
		function ApophisCodeComposerQuota({ rpc, t, directory }) {
			const call = useCaller(rpc);
			const enabled = react.useSyncExternalStore((listener) => directory.subscribe(listener), () => directory.getSnapshot())?.current?.provider === PROVIDER;
			const [balance, setBalance] = react.useState();
			const refresh = react.useRef(() => {});
			react.useEffect(() => {
				if (!enabled) {
					setBalance(void 0);
					return;
				}
				let live = true;
				let pending = false;
				const tick = () => {
					if (pending) return;
					pending = true;
					call("balance").then((value) => {
						if (live) setBalance(value);
					}).catch(() => {
						if (live) setBalance(void 0);
					}).finally(() => {
						pending = false;
					});
				};
				refresh.current = tick;
				tick();
				const timer = window.setInterval(tick, REFRESH_MS);
				return () => {
					live = false;
					refresh.current = () => {};
					window.clearInterval(timer);
				};
			}, [call, enabled]);
			if (!enabled || balance === void 0) return null;
			const row = activeUsage(balance);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(QuotaHover, {
				row,
				fetchedAt: balance.fetchedAt,
				empty: row?.error === void 0 ? t("composerNoKey") : t("composerUnread"),
				copy: {
					title: t("composerLabel"),
					key: t("composerKey"),
					failed: t("composerUnread")
				},
				align: "end",
				onRefresh: () => refresh.current(),
				t
			});
		}
		const inject = [
			"slots",
			"locale",
			"connection",
			"modelDirectories"
		];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "apophiscode-api: copy");
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-apophiscode-api";
				tag.textContent = STYLE;
				document.head.append(tag);
				return () => tag.remove();
			}, "apophiscode-api: style");
			const connection = ctx.get("connection");
			const t = ctx.locale.bind(NS);
			const call = channelCaller(connection.rpc);
			installImagePresentation(ctx, t, call);
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "apophiscode-api",
				order: 17,
				label: () => t("nav"),
				locale: NS,
				inject: () => ({
					rpc: connection.rpc,
					t
				})
			}, ApophisCodeSection));
			ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: "apophiscode-api-balance",
				order: 17,
				locale: NS,
				inject: (sessionId) => ({
					rpc: connection.rpc,
					t,
					directory: ctx.modelDirectories.directoryFor(sessionId).store
				})
			}, ApophisCodeComposerQuota));
			ctx.inject(["sessions", "conversation"], (scope) => {
				const sessions = scope.get("sessions");
				const conversation = scope.get("conversation");
				if (typeof sessions?.scope !== "function" || typeof conversation?.input?.for !== "function") return;
				scope.slots.inject("conversation.input.left", () => scope.slots.register({
					name: "conversation.input.left",
					id: "apophiscode-image-create",
					order: 31,
					inject: (sessionId) => ({
						call,
						t,
						directory: ctx.modelDirectories.directoryFor(sessionId).store,
						prepare: (text) => {
							const session = sessions.scope(sessionId);
							if (session === void 0) throw new Error("Composer unavailable");
							const input = conversation.input.for(session);
							const draft = input.state.getSnapshot();
							if (draft.phase !== "plain" || draft.occurrences?.length) throw new Error("Composer busy");
							input.setDraft([draft.draft, text].filter(Boolean).join("\n\n"));
						}
					})
				}, ApophisCodeImageShortcut));
			});
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map