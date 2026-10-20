/**
 * Identities and defaults this plugin owns.
 *
 * @module dsh-apophiscode-api/constants
 */

/** LLM provider route key; the model picker groups models under this id. */
export const PROVIDER = 'apophiscode'
/** Display name of the route in the picker and settings. */
export const DISPLAY_NAME = 'ApophisCode'
/** Loader row id, settings namespace, and credential-record scope. */
export const PLUGIN_ID = 'apophiscode-api'
/** Loopback RPC channel the browser half talks to. */
export const CHANNEL = '/apophiscode-api'
/** Settings namespace carrying host overrides. */
export const SETTINGS_NAMESPACE = 'apophiscode-api'
/** Credential record id inside the plugin's own scope. */
export const KEY_RECORD_ID = 'keys'
/** Image credentials never participate in the conversation key ring. */
export const IMAGE_KEY_RECORD_ID = 'image-keys'

/** Default model-traffic root; protocol clients append their own endpoint paths. */
export const DEFAULT_API_HOST = 'https://www.apophis.uk'
/** Ancillary requests use the explicitly configured status target only. */
export const DEFAULT_STATUS_HOST = 'https://www.apophis.uk'
/** Retained export for upstream integrations; this fork has no legacy destinations. */
export const LEGACY_STATUS_HOSTS = Object.freeze([])

/** Balance cache lifetime; a forced read bypasses it. */
export const DEFAULT_BALANCE_TTL_MS = 60_000
/** Bound on every account request this plugin makes. */
export const DEFAULT_REQUEST_TIMEOUT_MS = 20_000
