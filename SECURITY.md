# ApophisCode security boundary

ApophisCode separates credentials from browser RPC projections.
Store keys only through Settings → ApophisCode;
never include keys or credential-file contents in logs, chat or reports.

Credentials use the independent `apophiscode-api` record scope. Model traffic
and ancillary requests default to `https://www.apophis.uk`; status requests
remain on their explicitly configured destination on failure. Browser RPC
returns public projections, not raw credential material. Requests still leave
the machine and are processed by the configured relay.

All actively constructed URLs use the configured target. OpenAI HTTP
transports reject redirects through their per-request fetch hook. Native
Gemini bundles the locked Google API and SDK locally with a reviewed patch:
Fetch rejects redirects before forwarding credentials, and SDK-framed SSE
errors keep their status and reason before response projection. The patch
does not modify global fetch or require a patched host dependency. Build-time
version, source hash, patch and bundle checks fail closed. Native SDK encoding,
SSE framing and pi-ai events remain intact; final-bundle local-server tests
cover both Gemini models. See [validation](docs/validation.md) and
[third-party notices](THIRD_PARTY_NOTICES.md).

Version checks contact only this package's official npm latest endpoint.
Updates require an explicit user action and a registry install; local file/link
installs stay protected. Package-manager output remains host-side. Publication
uses an interactive first release and OIDC Trusted Publishing for later releases,
without storing a long-lived npm token. See [publishing](docs/publishing.md).
Keep vulnerability evidence local and redact credentials before sharing it
with this project's maintainer. Include the affected version, configured
protocol and a credential-free reproduction.
