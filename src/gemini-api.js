/** Gemini's native API, including level-based thinking on older pi-ai hosts. */
import { clampThinkingLevel } from '@earendil-works/pi-ai'
import * as googleNativeApi from '@earendil-works/pi-ai/api/google-generative-ai'

const GEMINI_MODELS = ['gemini-4-argon', 'gemini-3.8-flash']

/** Run `rewrite` on the request payload ahead of any caller hook. */
function withPayload(options, rewrite) {
  return {
    ...options,
    onPayload: async (payload, descriptor) => {
      const rewritten = rewrite(payload)
      return await options?.onPayload?.(rewritten, descriptor) ?? rewritten
    },
  }
}

/**
 * pi-ai 0.85 treats Argon as a budget-based model, and defaults Flash to
 * MINIMAL when reasoning is omitted. Preserve the inherited LOW/MEDIUM/HIGH
 * catalog and MEDIUM default for Apophis verification. Keep the native SDK
 * stream, credentials and tools; correct that config without changing history.
 * The SDK preserves valid same-model thought signatures. The upstream
 * gateway's skip-signature workaround has no verified Apophis equivalent.
 */
export function createGeminiApi() {
  // This native entry and its patched SDK are bundled locally. Other APIs and
  // the host's pi-ai registry stay external; no host SDK patch is required.
  const api = googleNativeApi
  return {
    ...api,
    streamSimple(model, context, options) {
      if (!GEMINI_MODELS.includes(model.id)) return api.streamSimple(model, context, options)
      const level = options?.reasoning === undefined ? 'medium' : clampThinkingLevel(model, options.reasoning)
      const wireLevel = (model.thinkingLevelMap?.[level] ?? level).toUpperCase()
      return api.streamSimple(model, context, withPayload(options, payload => {
        const { thinkingBudget: _budget, ...thinking } = payload.config?.thinkingConfig ?? {}
        return { ...payload, config: { ...payload.config, thinkingConfig: { ...thinking, thinkingLevel: wireLevel } } }
      }))
    },
  }
}
