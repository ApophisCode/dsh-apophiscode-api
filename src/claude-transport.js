/**
 * Which transport a Claude request uses: the plugin's own Messages HTTP client,
 * or the official Claude Code CLI on this device.
 *
 * Apophis's public Messages contract does not establish group-specific CLI
 * requirements. Auto therefore uses HTTP; only an explicit user preference
 * selects the CLI. Historical group names do not decide transport.
 *
 * Only the transport changes: DSH's agent loop, tools, permissions, plan mode,
 * attachments and history are identical on both, and no other provider or
 * credential is ever substituted.
 *
 * @module dsh-apophiscode-api/claude-transport
 */

/** No Apophis group-specific transport requirements have been established. */
export const CLI_ONLY_GROUPS = Object.freeze([])
export const HTTP_CLAUDE_GROUPS = Object.freeze([])

/** `auto` uses native HTTP; `cli` and `http` pin one transport. */
export const CLAUDE_TRANSPORTS = Object.freeze(['auto', 'cli', 'http'])
export const DEFAULT_CLAUDE_TRANSPORT = 'auto'

/** Whether a catalog model is served over the Anthropic Messages protocol. */
export const isClaudeModel = model => model?.api === 'anthropic-messages'

/** Read the stored preference; anything unknown is the default. */
export function readClaudeTransport(value) {
  return CLAUDE_TRANSPORTS.includes(value) ? value : DEFAULT_CLAUDE_TRANSPORT
}

/**
 * Decide the transport for a Claude request.
 * @param options - the stored preference; group readings are intentionally
 *   not a source of transport policy without Apophis evidence.
 * @returns `{ transport: 'cli' | 'http', reason }`.
 */
export function claudeTransportFor({ preference } = {}) {
  const pinned = readClaudeTransport(preference)
  if (pinned !== 'auto') return { transport: pinned, reason: 'preference' }
  return { transport: 'http', reason: 'unknown' }
}
