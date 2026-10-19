import { createHash } from 'node:crypto'
import { MCP_TOOL_PREFIX } from './claude-mcp-bridge.js'

// Preserve the upstream built-in wire spellings and persisted tool history.
// Declare them only for matching offered DSH tools; HTTP does not inject a
// CLI identity. Schemas and host dispatch stay unchanged: these aliases are
// request-scoped and cannot authorize an unoffered call.
const BUILTIN_NAMES = Object.freeze({ bash: 'Bash', read: 'Read', write: 'Write', edit: 'Edit', glob: 'Glob', grep: 'Grep' })

/** Through the CLI every DSH tool belongs to this plugin's MCP server. */
const CLI_PREFIX = MCP_TOOL_PREFIX
/** A name the CLI keeps verbatim: no double underscore, and the whole name within 64 characters. */
const CLI_SAFE_NAME = /^[a-zA-Z0-9-]+(?:_[a-zA-Z0-9-]+)*$/u
const CLI_MAX_NAME = 64 - CLI_PREFIX.length

const digestOf = name => createHash('sha256').update(name).digest('hex').slice(0, 12)

/** The wire name of a DSH tool when the official CLI carries the request. */
export function cliToolName(name) {
  if (CLI_SAFE_NAME.test(name) && name.length <= CLI_MAX_NAME) return `${CLI_PREFIX}${name}`
  const slug = name.replace(/[^a-zA-Z0-9-]+/gu, '_').replace(/^_+/u, '').slice(0, CLI_MAX_NAME - 13).replace(/_+$/u, '') || 'tool'
  return `${CLI_PREFIX}${slug}_${digestOf(name)}`
}

/**
 * Request-scoped wire names, restored to their originals before host
 * dispatch. Over HTTP the CLI-compatible built-in spellings are used; through
 * the CLI every tool is listed by the MCP bridge and the model sees
 * `mcp__apophiscode__<name>`.
 * @param options - `cli` selects the CLI transport's names.
 */
export function createClaudeToolNames({ cli = false } = {}) {
  const owners = new Map(), offered = new Map(), clientNames = new Set()
  let declaredNames = new Set()
  const encode = (name, available = false) => {
    if (typeof name !== 'string') return name
    let alias
    if (cli) alias = cliToolName(name)
    else {
      const slug = name.replace(/[^a-zA-Z0-9_-]/gu, '_').slice(0, CLI_MAX_NAME - 13) || 'tool'
      const builtin = Object.hasOwn(BUILTIN_NAMES, name) ? BUILTIN_NAMES[name] : undefined
      // Never make a native tool's exact name refer to a different host tool.
      alias = builtin && !declaredNames.has(builtin) ? builtin : `${CLI_PREFIX}${slug}_${digestOf(name)}`
    }
    if (owners.has(alias) && owners.get(alias) !== name) throw new Error('Ambiguous Claude tool name')
    owners.set(alias, name)
    if (available) { offered.set(alias, name); clientNames.add(name) }
    return alias
  }
  const encodeBlock = block => {
    if (block?.type === 'tool_use') return { ...block, name: encode(block.name) }
    if (block?.type === 'tool_reference') return { ...block, tool_name: encode(block.tool_name) }
    if (block?.type === 'tool_result' && Array.isArray(block.content)) return { ...block, content: block.content.map(encodeBlock) }
    return block
  }
  const decodeBlock = block => {
    if (block?.type !== 'toolCall') return block
    // ToolRuntime knows registered tools, not this request's wire aliases.
    // Leaving an unknown wire name unchanged could make a hallucinated native
    // name executable even when that tool was not offered for this turn.
    if (!offered.has(block.name)) throw new Error('Claude returned a tool that was not offered for this request')
    return { ...block, name: offered.get(block.name) }
  }
  const decodeMessage = message => Array.isArray(message?.content) ? { ...message, content: message.content.map(decodeBlock) } : message
  const decodeEvent = event => ({
    ...event,
    ...(event.partial ? { partial: decodeMessage(event.partial) } : {}),
    ...(event.message ? { message: decodeMessage(event.message) } : {}),
    ...(event.error ? { error: decodeMessage(event.error) } : {}),
    ...(event.toolCall ? { toolCall: decodeBlock(event.toolCall) } : {}),
  })
  return {
    encodePayload(payload) {
      declaredNames = new Set(payload.tools?.map(tool => tool.name) ?? [])
      return {
        ...payload,
        ...(Array.isArray(payload.tools) ? { tools: payload.tools.map(tool => tool.input_schema ? { ...tool, name: encode(tool.name, true) } : tool) } : {}),
        ...(Array.isArray(payload.messages) ? { messages: payload.messages.map(message => Array.isArray(message.content) ? { ...message, content: message.content.map(encodeBlock) } : message) } : {}),
        ...(payload.tool_choice?.type === 'tool' && clientNames.has(payload.tool_choice.name) ? { tool_choice: { ...payload.tool_choice, name: encode(payload.tool_choice.name) } } : {}),
      }
    },
    decodeStream(stream) {
      return new Proxy(stream, {
        get(target, property) {
          if (property === 'result') return async (...args) => decodeMessage(await target.result(...args))
          if (property === Symbol.asyncIterator) return () => {
            const iterator = target[Symbol.asyncIterator]()
            return {
              async next(...args) { const item = await iterator.next(...args); return item.done ? item : { ...item, value: decodeEvent(item.value) } },
              ...(typeof iterator.return === 'function' ? { return: (...args) => iterator.return(...args) } : {}),
              ...(typeof iterator.throw === 'function' ? { throw: (...args) => iterator.throw(...args) } : {}),
              [Symbol.asyncIterator]() { return this },
            }
          }
          const value = Reflect.get(target, property, target)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    },
  }
}
