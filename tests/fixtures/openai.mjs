/** OpenAI wire fixtures; the actual SDKs own all request and response conversion. */
export function eventStream(events, { bytewise = false } = {}) {
  const wire = events.map(event => `data: ${JSON.stringify(event)}\r\n\r\n`).join('')
  if (!bytewise) return new Response(wire, { headers: { 'content-type': 'text/event-stream' } })
  const bytes = new TextEncoder().encode(wire)
  let offset = 0
  return new Response(new ReadableStream({ pull(controller) {
    if (offset === bytes.length) controller.close()
    else controller.enqueue(bytes.slice(offset, ++offset))
  } }), { headers: { 'content-type': 'text/event-stream' } })
}

export function chatFrames(model, { textParts = ['你好', '📦，完成。'], tool, error, incomplete = false } = {}) {
  const frame = (delta, finish_reason = null) => ({ id: 'chat_fixture', object: 'chat.completion.chunk', created: 1,
    model, choices: [{ index: 0, delta, finish_reason }] })
  const events = []
  if (tool !== undefined) {
    events.push(frame({ role: 'assistant', tool_calls: [{ index: 0, id: tool.id, type: 'function', function: { name: tool.name, arguments: '' } }] }))
    for (const part of tool.argumentsParts) events.push(frame({ tool_calls: [{ index: 0, function: { arguments: part } }] }))
  } else for (const content of textParts) events.push(frame({ content }))
  if (error !== undefined) events.push({ error: { message: error, type: 'server_error', code: 'server_error' } })
  else if (!incomplete) events.push(frame({}, tool === undefined ? 'stop' : 'tool_calls'))
  return events
}

export function responseFrames(model, { textParts = ['你好', '📦，完成。'], tool, error, incomplete = false } = {}) {
  const events = [{ type: 'response.created', response: { id: 'resp_fixture', object: 'response', status: 'in_progress', output: [] } }]
  let item
  if (tool !== undefined) {
    item = { type: 'function_call', id: 'fc_fixture', call_id: tool.id, name: tool.name, arguments: '', status: 'in_progress' }
    events.push({ type: 'response.output_item.added', output_index: 0, item })
    for (const delta of tool.argumentsParts) events.push({ type: 'response.function_call_arguments.delta', output_index: 0, item_id: item.id, delta })
    item = { ...item, status: 'completed', arguments: tool.argumentsParts.join('') }
    events.push({ type: 'response.function_call_arguments.done', output_index: 0, item_id: item.id, arguments: item.arguments })
  } else {
    item = { type: 'message', id: 'msg_fixture', role: 'assistant', status: 'in_progress', content: [] }
    events.push({ type: 'response.output_item.added', output_index: 0, item },
      { type: 'response.content_part.added', output_index: 0, content_index: 0, item_id: item.id, part: { type: 'output_text', text: '', annotations: [] } })
    for (const delta of textParts) events.push({ type: 'response.output_text.delta', output_index: 0, content_index: 0, item_id: item.id, delta })
    item = { ...item, status: 'completed', content: [{ type: 'output_text', text: textParts.join(''), annotations: [] }] }
  }
  if (error !== undefined) events.push({ type: 'error', code: 'server_error', message: error })
  else if (!incomplete) events.push({ type: 'response.output_item.done', output_index: 0, item },
    { type: 'response.completed', response: { id: 'resp_fixture', status: 'completed', model, output: [item], usage: { input_tokens: 8, output_tokens: 2, total_tokens: 10 } } })
  return events
}
