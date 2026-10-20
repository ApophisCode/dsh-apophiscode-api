# Changelog

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
