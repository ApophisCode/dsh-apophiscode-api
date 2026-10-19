# Third-party notices

This ApophisCode adaptation retains the root MIT license and upstream BaronCyrus attribution.

The host bundle embeds the native Google API from @earendil-works/pi-ai 1.1.0 and @google/genai 2.21.0, plus the actual bundled runtime dependencies below. All other DSH/primary pi-ai APIs remain host dependencies.

Local modifications: patches/@google__genai@2.21.0.patch changes only dist/node/index.mjs to reject Fetch redirects and to preserve errors in SDK-framed SSE data before response projection. The original native Google encoding, framing, conversion and pi-ai event loop remain in use. The bundled dependencies below are otherwise unmodified.

License texts are copied from the installed exact-version packages. pi-ai omits its license in the npm tarball: its MIT text is retained from the upstream v1.1.0 repository tag, https://github.com/earendil-works/pi/blob/v1.1.0/LICENSE (Copyright (c) 2025 Mario Zechner). data-uri-to-buffer includes its MIT text in README.md; that section is reproduced verbatim with HTML entities decoded.

| Package | Version | License | Included text |
|---|---|---|---|
| `@earendil-works/pi-ai` | 1.1.0 | MIT | [earendil-works-pi-ai-1.1.0.LICENSE](licenses/earendil-works-pi-ai-1.1.0.LICENSE) |
| `@google/genai` | 2.21.0 | Apache-2.0 | [google-genai-2.21.0.LICENSE](licenses/google-genai-2.21.0.LICENSE) |
| `agent-base` | 7.1.4 | MIT | [agent-base-7.1.4.LICENSE](licenses/agent-base-7.1.4.LICENSE) |
| `base64-js` | 1.5.1 | MIT | [base64-js-1.5.1.LICENSE](licenses/base64-js-1.5.1.LICENSE) |
| `bignumber.js` | 9.3.1 | MIT | [bignumber.js-9.3.1.LICENSE](licenses/bignumber.js-9.3.1.LICENSE) |
| `buffer-equal-constant-time` | 1.0.1 | BSD-3-Clause | [buffer-equal-constant-time-1.0.1.LICENSE](licenses/buffer-equal-constant-time-1.0.1.LICENSE) |
| `data-uri-to-buffer` | 4.0.1 | MIT | [data-uri-to-buffer-4.0.1.LICENSE](licenses/data-uri-to-buffer-4.0.1.LICENSE) |
| `debug` | 4.4.3 | MIT | [debug-4.4.3.LICENSE](licenses/debug-4.4.3.LICENSE) |
| `ecdsa-sig-formatter` | 1.0.11 | Apache-2.0 | [ecdsa-sig-formatter-1.0.11.LICENSE](licenses/ecdsa-sig-formatter-1.0.11.LICENSE) |
| `extend` | 3.0.2 | MIT | [extend-3.0.2.LICENSE](licenses/extend-3.0.2.LICENSE) |
| `fetch-blob` | 3.2.0 | MIT | [fetch-blob-3.2.0.LICENSE](licenses/fetch-blob-3.2.0.LICENSE) |
| `formdata-polyfill` | 4.0.10 | MIT | [formdata-polyfill-4.0.10.LICENSE](licenses/formdata-polyfill-4.0.10.LICENSE) |
| `gaxios` | 7.3.1 | Apache-2.0 | [gaxios-7.3.1.LICENSE](licenses/gaxios-7.3.1.LICENSE) |
| `gcp-metadata` | 8.1.2 | Apache-2.0 | [gcp-metadata-8.1.2.LICENSE](licenses/gcp-metadata-8.1.2.LICENSE) |
| `google-auth-library` | 10.9.1 | Apache-2.0 | [google-auth-library-10.9.1.LICENSE](licenses/google-auth-library-10.9.1.LICENSE) |
| `google-logging-utils` | 1.1.3 | Apache-2.0 | [google-logging-utils-1.1.3.LICENSE](licenses/google-logging-utils-1.1.3.LICENSE) |
| `https-proxy-agent` | 7.0.6 | MIT | [https-proxy-agent-7.0.6.LICENSE](licenses/https-proxy-agent-7.0.6.LICENSE) |
| `json-bigint` | 1.0.0 | MIT | [json-bigint-1.0.0.LICENSE](licenses/json-bigint-1.0.0.LICENSE) |
| `jwa` | 2.0.1 | MIT | [jwa-2.0.1.LICENSE](licenses/jwa-2.0.1.LICENSE) |
| `jws` | 4.0.1 | MIT | [jws-4.0.1.LICENSE](licenses/jws-4.0.1.LICENSE) |
| `ms` | 2.1.3 | MIT | [ms-2.1.3.LICENSE](licenses/ms-2.1.3.LICENSE) |
| `node-domexception` | 1.0.0 | MIT | [node-domexception-1.0.0.LICENSE](licenses/node-domexception-1.0.0.LICENSE) |
| `node-fetch` | 3.3.2 | MIT | [node-fetch-3.3.2.LICENSE](licenses/node-fetch-3.3.2.LICENSE) |
| `p-retry` | 4.6.2 | MIT | [p-retry-4.6.2.LICENSE](licenses/p-retry-4.6.2.LICENSE) |
| `retry` | 0.13.1 | MIT | [retry-0.13.1.LICENSE](licenses/retry-0.13.1.LICENSE) |
| `safe-buffer` | 5.2.1 | MIT | [safe-buffer-5.2.1.LICENSE](licenses/safe-buffer-5.2.1.LICENSE) |
| `web-streams-polyfill` | 3.3.3 | MIT | [web-streams-polyfill-3.3.3.LICENSE](licenses/web-streams-polyfill-3.3.3.LICENSE) |
| `ws` | 8.22.0 | MIT | [ws-8.22.0.LICENSE](licenses/ws-8.22.0.LICENSE) |
| `rolldown` (generated runtime helper) | 1.1.5 | MIT | [rolldown-1.1.5.LICENSE](licenses/rolldown-1.1.5.LICENSE) |
