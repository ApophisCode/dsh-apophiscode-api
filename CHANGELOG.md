# Changelog

## 0.1.7 — 2026-10-20

- Route DeepSeek-family conversations through Responses under the explicitly
  requested Apophis transport policy, ahead of protocol references. Keep raw
  active-key model IDs and distinct effort metadata; send one business request
  without a protocol probe or alternate-endpoint replay. Other families retain
  their existing protocol resolution. Record policy evidence separately from
  SDK metadata and gateway capability declarations.
- Include exact-ID capability agreements from the SDK's remaining catalogs
  when a native supplier has no entry. Resolve protocol and effort conflicts
  independently, retain native and gateway precedence, and never copy another
  supplier's endpoint, credentials or compatibility settings. This restores
  supplementary SDK models without an unrelated Responses verification gate.
- Fix stale model cards after key switches by giving model and search cards
  distinct React identities. Keep credential status independent of balance
  failures or pending reads, allow key actions while balances load, and localize
  balance errors with explicit last-success timestamps.
- Restore model-specific reasoning choices from exact installed-SDK metadata
  when the gateway omits them. Gateway declarations take priority; unknown IDs
  stay visible without guessed efforts. Use the exact SDK protocol directly
  and use its explicit effort encoding without forcing defaults or raising a
  caller's output cap. Reserve probes for unknown protocols, so known models
  cannot be blocked by a separate verification request. Keep gateway acceptance
  separate from SDK reference data.
- Distinguish protocol verification connection failures, deadline expiry,
  response-body limits, invalid responses and gateway HTTP rejection. Include
  the failing endpoint and safe transport code; redact reflected credentials.
- Remove duplicate per-key model lists from Accounts and keys. Keep model
  visibility controls in their dedicated card and simplify the introductory copy.
  Remove group and Claude transport details from key rows; account refresh
  reloads the active key's models without requesting group listings.
- Remove plugin-owned model catalogs, aliases, model-name protocol dispatch,
  capacity/effort defaults, title substitutes and fixed search/image model choices.
  Preserve active-key gateway IDs and response order across discovery, settings,
  preparation, invocation and maintenance scripts.
- Use structured gateway declarations, or bounded independent text verification
  for undeclared protocols. Isolate evidence by target/key/exact ID, coalesce
  concurrent checks and expire evidence after ten minutes. Business payloads
  never become protocol probes; ambiguous failures never switch protocols.
- Keep undeclared limits, image input and efforts absent from exact SDK metadata unknown. Use an application
  request budget where Messages requires one, preserve explicit efforts and
  keep HTTP as the default without a Claude Code CLI installation dependency.
- Use dynamic search/image settings through RPC and report directory failures
  separately from successful credential writes. Preserve explicit image quality
  on model changes. Tests use explicit offline gateway declarations; live text
  evidence and remaining DSH acceptance are recorded in docs/validation.md.

## 0.1.6 — 2026-10-20

- Fix plugin updates on Windows CLI hosts by locating npm/Corepack pnpm
  launchers and starting their program directly with the host Node. Preserve
  desktop-bundled pnpm, support native executables and POSIX script symlinks,
  and keep exact-version installs and the profile's release-age policy.
- Show localized update failure reasons and retain the retry button; installer
  output and host paths stay private. Explain when reopening DSH is required.
- Add real-process/RPC update regressions and native Windows, Linux and macOS
  CI jobs. Current local evidence and remaining checks are in `docs/validation.md`.

## 0.1.5 — 2026-10-20

- Refresh the open model visibility card after conversation-key changes, host
  changes and manual account refresh. Discard the previous directory and its
  pending replies so switching to a GPT key cannot keep showing DeepSeek IDs.
- Add built-client tests through the registered plugin RPC and real DSH model
  registry for switching, empty rings, discovery errors, recovery and delayed
  visibility-save replies. Evidence is recorded in `docs/validation.md`.

## 0.1.4 — 2026-10-19

- Deliver the ApophisCode provider with its own package, provider, credential,
  settings, RPC, search, image and CLI MCP identities.
- Use ApophisCode names for implementation exports, UI components and the local
  host compatibility fixture. Direct helper imports use the current names.
- Keep active-key model discovery in API response order with exact IDs and
  display names. Preserve protocol declarations and explicit invocation limits.
- Provide exact npm installation, this repository's release list and manual
  updates that respect local installs, release cooldowns and runtime reloads.
- Include current Chinese and English onboarding and the official Model Plaza
  entry. Keep local development references and process records out of the package.
- Preserve credential isolation, transport safeguards and all required licenses.
  Validation and live-service limits are recorded in `docs/validation.md`.
- Published to npm latest and GitHub v0.1.4 on 2026-10-20. Public tarballs match
  the reviewed CI artifact; OIDC provenance and installation documentation are
  verified. Real DSH installation and live updates remain unverified.
