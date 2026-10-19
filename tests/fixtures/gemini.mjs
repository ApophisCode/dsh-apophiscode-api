/** Real Gemini SSE envelopes for the Google SDK; all signatures are offline fixtures. */
export const TEXT_SIGNATURE = Buffer.from('fixture text signature').toString('base64')
export const TOOL_SIGNATURE = Buffer.from('fixture tool signature').toString('base64')

export function nativeFrame(parts, model = 'gemini-4-argon', finishReason) {
  return `data: ${JSON.stringify({
    candidates: [{ content: { role: 'model', parts }, ...(finishReason && { finishReason }), index: 0 }],
    ...(finishReason && { usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 2, thoughtsTokenCount: 4, totalTokenCount: 16 } }),
    modelVersion: model,
  })}\n\n`
}

export function nativeStream(parts = [{ text: 'Checked.', thought: true }, { text: 'ok', thoughtSignature: TEXT_SIGNATURE }], model = 'gemini-4-argon') {
  return new Response(nativeFrame(parts, model, 'STOP'), { headers: { 'Content-Type': 'text/event-stream' } })
}

/** Split UTF-8 bytes across reads as a real network stream may do. */
export function nativeFrames(frames, model) {
  const bytes = new TextEncoder().encode(frames.map((parts, index) => nativeFrame(parts, model, index === frames.length - 1 ? 'STOP' : undefined)).join(''))
  return new Response(new ReadableStream({ start(controller) {
    for (let offset = 0; offset < bytes.length; offset += 11) controller.enqueue(bytes.slice(offset, offset + 11))
    controller.close()
  } }), { headers: { 'Content-Type': 'text/event-stream' } })
}
