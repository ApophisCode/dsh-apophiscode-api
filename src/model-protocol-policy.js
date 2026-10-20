/** Explicit Apophis transport policy; this declares no model capabilities. */
export function requestedModelProtocol(id) {
  return /^deepseek(?:-|$)/iu.test(id) ? 'openai-responses' : undefined
}
