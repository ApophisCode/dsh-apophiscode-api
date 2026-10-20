/** Native Gemini encoder. Model capabilities never come from a name table. */
import * as googleNativeApi from '@earendil-works/pi-ai/api/google-generative-ai'

export function createGeminiApi() {
  return googleNativeApi
}
