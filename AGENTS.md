# Repository agent guide

This file governs `dsh-apophiscode-api`, the ApophisCode provider plugin for
DeepSeek Harness. Preserve `LICENSE` and all third-party notices when
modifying or distributing the project.

## Task and source boundaries

- Read `CONTEXT.md` for shared terms and `docs/validation.md` before making
  compatibility claims. When assigned a local ticket, read its spec and
  tracking rules if present, and record verification in that ticket.
- Preserve the existing JS/React DSH profile plugin, adapter, protocol clients,
  credential ring, RPC and build structure. Host code is in `src/index.js`
  and its sibling modules; browser UI is in `src/client.jsx` and siblings.
- Advertise exactly the raw IDs returned by the current active plugin-owned
  key's `/v1/models`, in response order, with display name equal to ID. Do not
  union enabled keys, intersect with a static catalog, or filter dated IDs.
  Unknown metadata stays visible and resolvable; invocation fails explicitly
  without fabricated capabilities. Preserve verified
  protocol/effort declarations; record evidence for any interface change in
  `CHANGELOG.md` and the validation record. A successful offline fixture is not
  proof that a model works on the real gateway.
- Runtime identity is package `dsh-apophiscode-api`, provider `apophiscode`,
  display `ApophisCode`, row/settings/credential scope `apophiscode-api`, and
  RPC `/apophiscode-api`. Use ApophisCode names for plugin-owned code and
  local test packages.
- Edit `src/` and regenerate tracked `lib/` using `pnpm run build`.
  Build artifacts and dependencies belong in ignored `.artifacts/` and
  `node_modules/`; do not hand-edit bundles.

## Credentials and host safety

- Authenticate only from keys the user stored in this plugin's credential
  scope. Keep other providers' credentials, sessions, profiles and plugins
  separate.
  Ambient environment variables and external CLI logins do not supply keys.
- Never print, log, commit, return to the browser or include in diagnostics any
  API key. The browser receives only the public RPC projections.
- Default API and status roots are `https://www.apophis.uk`. Authenticated
  requests stay on the explicitly configured target; failures never trigger
  a request to a legacy or discovered CDN host.
- Ancillary balance/group/search/image compatibility requires evidence from
  Apophis. Surface unsupported responses and failures; do not invent data or
  infer live success from fixtures or other services.
- The Claude CLI, when explicitly used, remains a transport with its own tools
  disabled. DSH owns tools, permissions, plan mode and history. Keep the CLI
  configuration and MCP identity isolated. Changes to transport behavior need
  matching offline tests and separately recorded live verification when a
  user-configured key is available.

## Validation and local delivery

- Install with `pnpm install --frozen-lockfile`. Run behavior tests at the
  registered adapter/service seam, then the applicable full checks.
  `pnpm run check` runs tests, regenerates both bundles and packs a tarball.
- Use the existing real PiAiAdapter, ToolRuntime and HostConnection tests.
  A shared credential test service must store records by key to prove
  isolation. Keep offline protocol fixtures distinct from real gateway and
  real DSH interaction evidence.
- Record newly discovered regressions and their validation separately from
  historical checks. Keep current evidence in `docs/validation.md`.
- The release source is this package on the official npm registry; the release
  list belongs to this repository. Keep unpublished, failed, installed and
  running-version states distinct. Never replace a local file/link install
  through the online updater or bypass the host's release-age policy.
- Follow `docs/publishing.md` for manual releases and artifact integrity checks.
  Remote pushes require explicit task authorization; npm publication, tags and
  Releases each require separate authorization. Ordinary CI never publishes.
- Do not install into, start, stop or restart the user's existing DSH during
  source implementation. Local code approval is separate from live app
  lifecycle permission. Keep installation and recovery instructions truthful.
