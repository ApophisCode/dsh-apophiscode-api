<p align="center">
  <img src="https://raw.githubusercontent.com/ApophisCode/dsh-apophiscode-api/main/icon-subscription.webp" width="128" height="128" alt="ApophisCode icon" />
</p>

<h1 align="center">ApophisCode for DSH</h1>

<p align="center">
  Connect DeepSeek Harness to Apophis for model conversations, tools and API key management.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-apophiscode-api"><img src="https://img.shields.io/npm/v/dsh-apophiscode-api?color=6366f1" alt="npm version" /></a>
  <a href="https://github.com/ApophisCode/dsh-apophiscode-api/actions/workflows/ci.yml"><img src="https://github.com/ApophisCode/dsh-apophiscode-api/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-22c55e" alt="MIT license" /></a>
</p>

<p align="center">
  <a href="https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/README.md">简体中文</a> · <strong>English</strong>
</p>

<p align="center">
  <a href="https://www.apophis.uk">Apophis website</a> ·
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#updating-the-plugin">Updates</a> ·
  <a href="https://github.com/ApophisCode/dsh-apophiscode-api/releases">Releases</a> ·
  <a href="#model-catalog">Models</a> ·
  <a href="#community-and-feedback">Community &amp; feedback</a>
</p>

---

ApophisCode is a model provider plugin for **DeepSeek Harness (DSH)**, configured
to connect to **[Apophis](https://www.apophis.uk)**. Manage API keys in
**Settings → ApophisCode** and select models from the **ApophisCode** model group.
The plugin keeps its own configuration and credentials and can coexist with other providers.

> Install an exact npm version through DSH's plugin manager. Available versions are listed on [npm](https://www.npmjs.com/package/dsh-apophiscode-api) and in [Releases](https://github.com/ApophisCode/dsh-apophiscode-api/releases).
> Real DSH interaction evidence belongs to local `0.1.0`. See the [validation record](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/validation.md) (Chinese) for installation, model, tool and image verification limits.

## Features

| Capability | What it provides |
| --- | --- |
| **Multiple model families** | The active key’s exact model IDs, with existing Responses, Claude Messages and native Gemini clients. |
| **Streaming and tools** | Streaming output, reasoning controls and DSH tool integration, with permissions and conversation history managed by DSH. |
| **Multiple API keys** | Add, rename, select, disable and delete keys, with key rotation and status indicators. |
| **Balance and model coverage** | Read service balances or quotas, public group descriptions and the selected key's accessible model list. |
| **Web search** | Exact models from the active conversation key, using a verified protocol and requiring structured results. |
| **Image generation and editing** | Separate image keys, model selection and generation/editing tool entry points. |

Implementation coverage and live availability are tracked separately. Settings,
model selection, key balances and model lists have successful live records.
Search, images and individual model results are documented in the
[validation record](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/validation.md).

## Quick start

### 1. Install in DSH

Have a working DSH installation and a conversation API key from [Apophis](https://www.apophis.uk) ready.
Open **Settings → Plugins → Add Plugin** and enter this in the package name/address field:

```text
dsh-apophiscode-api@0.1.7
```

Install it and confirm that **ApophisCode** is enabled. This requests the exact npm version.
To install another published version, replace the number after `@` with its version from [Releases](https://github.com/ApophisCode/dsh-apophiscode-api/releases).
If DSH reports a release cooldown, wait until the stated time and retry.

For Release files and source builds, see [Other installation methods](#other-installation-methods).

### 2. Verify the loaded version

Open **Settings → ApophisCode → Plugin version** and check that the running version matches the version you installed.
If the old version remains, a restart is pending, or the settings entry is missing, quit and reopen the **same DSH version and profile**, then check again.
Refreshing the browser page does not reload the plugin module inside the host.

### 3. Add a conversation key

1. In **Settings → ApophisCode → Accounts and keys**, paste your conversation API key, optionally add a label, and click **Add**.
2. Confirm that the intended key is marked **Active**. With multiple keys, choose **Use this key** to set your preferred key.
3. The default API root is `https://www.apophis.uk`. If balance or model-list reads fail, inspect the corresponding error.

Keep API keys out of issues, logs and public screenshots. Advanced host settings are covered in the [installation guide](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/local-installation.md) (Chinese).

### 4. Choose a model and start a conversation

1. Return to a conversation and select a model from the **ApophisCode** group.
2. Send a short message and confirm a normal reply before adjusting reasoning, model visibility and search settings.

The list comes from the active key's API. A listed model may still fail because of key permissions, server support or service availability.
See [Troubleshooting](#troubleshooting) for error guidance.
Image tools require a separate image key and image model; their verification scope is in the [validation record](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/validation.md).

## Updating the plugin

To upgrade from 0.1.4 or 0.1.5, first use DSH's **Settings → Plugins → Add Plugin**
and install `dsh-apophiscode-api@0.1.7`. The updater inside those older versions may fail to start the installer.

For an npm installation:

1. Open **Settings → ApophisCode → Plugin version** and click **Check for updates**.
2. When a newer version is available, click **Update plugin**. **Release list** on the same card opens release notes and downloads.
3. After installation, restart the same DSH version and profile, then verify the running version again.

Updates run when you request them. If a release cooldown is reported, retry after the stated time.
A local tarball or development link retains its installation source; explicitly install an exact npm version through the plugin manager to switch sources.
Before switching an older local installation, record its profile and plugin version, retain configuration, credentials and conversations, and follow the installation and loading steps above.
Recovery steps are in the [installation guide](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/local-installation.md).

## Other installation methods

### Install a Release file

1. Choose a version from [Releases](https://github.com/ApophisCode/dsh-apophiscode-api/releases), download its `.tgz` and `SHA256SUMS`, and verify the archive's SHA-256.
2. In **Settings → Plugins → Add Plugin**, enter the downloaded file's **absolute local path** in the package name/address field and install it.
3. Continue with [Quick start](#quick-start) to verify loading, add a key and select a model.

This is a local-file installation. Future updates require another explicit file installation or a switch to an exact npm version in the plugin manager.
See the [installation guide](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/local-installation.md) for CLI installation, development links and recovery, or [Development and validation](#development-and-validation) for source builds.

## Model catalog

Visit the **[Apophis Model Plaza](https://www.apophis.uk/model-plaza)** for the
models, channel groups and prices currently listed by Apophis.

Choose a model from the **ApophisCode** group in a DSH conversation. The displayed
models come from the conversation key currently in use. Adjust their visibility
under **Settings → ApophisCode → Visible models**.
Accounts and keys manages keys and balances; model lists live in Visible models.

The catalog preserves the active key’s raw `/v1/models` IDs in response order,
with display names equal to IDs. Changing keys replaces the catalog. There is
no built-in model list, alias rewrite, cross-key union or title-model substitute.
Search models use the conversation key’s directory; image models use the separate image key’s directory.

DeepSeek-family conversations use `/v1/responses` under this plugin's explicit
Apophis transport policy, ahead of gateway and SDK protocol references. Raw IDs
are preserved without model rewrites or per-model protocol tables.
Other families use structured gateway protocol declarations when present.
An exact SDK protocol reference is used when the gateway omits its declaration.
If no policy or source provides a protocol, the plugin sends an independent short
text check before the first call. This may consume a small amount of quota and
never includes your conversation or tools. Successful protocol evidence is
isolated by target, key and exact ID, and cached for ten minutes. Only an explicit
protocol refusal advances to another protocol. Authentication, quota, timeout,
network and ambiguous failures stop verification. Failed business requests are
never resent using another protocol.

Reasoning efforts prefer gateway declarations. When absent, the installed SDK's
metadata supplements efforts by exact model ID, without prefix guesses or a
shared effort list for all models. SDK metadata changes with the dependency
version and does not prove current-key gateway authorization. Unmatched models
remain visible with unknown efforts. If the native catalog has no exact ID,
other SDK catalogs supplement only consistent supported-protocol and effort
declarations. Conflicting fields stay unknown; foreign service endpoints, auth
and compatibility settings are never imported. Default does not force an effort; explicit
choices use the corresponding SDK protocol encoder and retain gateway failures.
The DeepSeek policy or an exact SDK protocol reference permits direct invocation
without an extra probe; neither guarantees gateway acceptance. Independent probes
are reserved for models without a policy, gateway or exact SDK protocol declaration.
Undeclared context limits and image input remain unknown; SDK limits are not
advertised as gateway capacities.
A text check does not establish
image, search, tool or optional-parameter support. Actual availability depends on
key permissions and service status. See the [validation record](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/validation.md) for the evidence and its limits.

## Troubleshooting

### Key switching and balance updates

“Use this key” automatically reloads the active key’s model directory, clears
the previous list while loading, and reports discovery failures in the model
card. Balances load independently and do not disable key actions; the refresh
button stays busy to prevent duplicate reads. Failed updates retain any previous balance
with its last-success time; that amount is not a current reading.
An unreadable balance response alone does not establish model-call availability.

### Installation or updating reports a release cooldown

The host does not yet accept the newly published version. Wait until the stated time, then retry the same exact version or request the update again.
A version appearing in Releases does not establish that it meets the current profile's installation policy.

### Stale public group data or connection timeouts

The latest public directory request failed, so the interface retains the previous
result and labels it stale. This alone does not show that a key is invalid:
authenticated model coverage is read separately. Both successful requests and
timeouts have been observed; a single root cause has not been confirmed.
See the [validation record](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/validation.md).

### A listed model fails when called

A successful model-directory GET does not establish model POST availability.
Check model coverage in settings, then inspect the specific error:
`model_not_found`, `503` and connection timeouts need different investigation.
Successful installation or a readable balance does not establish model availability.

### HTTP and CLI transport for Claude

The default `auto` mode uses HTTP and does not require Claude Code. A local CLI
is needed only when explicitly selecting CLI transport. This mode uses isolated
configuration, with tools and permissions owned by DSH. Live CLI compatibility
with Apophis remains unverified.

### Removal and advanced host settings

The default `apiHost` is
`https://www.apophis.uk`. In DSH 0.2, host settings come from the profile configuration
and are read-only in the plugin panel. See the
[installation guide](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/local-installation.md) for development installation,
host rules, removal and recovery.

## Development and validation

Source builds use **Node.js 24 or later** and **pnpm 10.32.1**. Node.js 22.x from 22.19 onward is also supported:

```powershell
git clone https://github.com/ApophisCode/dsh-apophiscode-api.git
cd dsh-apophiscode-api
pnpm install --frozen-lockfile
pnpm run check
```

After `check` passes, install `.artifacts/dsh-apophiscode-api-0.1.7.tgz` using the local-file method above.

| Command | Purpose |
| --- | --- |
| `pnpm run test` | Run automated tests. |
| `pnpm run build` | Regenerate `lib/` from `src/`. |
| `pnpm run check` | Run tests, build and create the local package. |
| `node scripts/tool-check.mjs --help` | Show options for per-model tool-loop acceptance checks. |

Run development commands in the full source checkout. The installation package
contains runtime files, the icon, licenses and user documentation. Live tool checks
consume API quota; procedures and evidence requirements are in the
[validation record](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/validation.md). Maintainer steps are in the [publishing guide](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/docs/publishing.md) (Chinese). Read [AGENTS.md](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/AGENTS.md) before editing.

## Community and feedback

| Channel | Purpose |
| --- | --- |
| **QQ group: 425421707** | Usage questions, configuration discussions and shared experience. Search for the group number in QQ to join. |
| **[Issues and suggestions](https://github.com/ApophisCode/dsh-apophiscode-api/issues)** | Track bugs, feature requests and improvement suggestions. |

For bug reports, include **DSH/plugin versions, the model ID, reproduction steps,
expected behavior and the actual error**. Redact API keys, authorization headers
and personal information from logs and screenshots.

## License

Distributed under the [MIT License](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/LICENSE), with the applicable copyright notices
preserved. Bundled third-party components and their licenses are listed in
[THIRD_PARTY_NOTICES.md](https://github.com/ApophisCode/dsh-apophiscode-api/blob/main/THIRD_PARTY_NOTICES.md).
