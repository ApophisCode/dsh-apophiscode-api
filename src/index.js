/**
 * dsh-apophiscode-api — a self-contained ApophisCode route for DeepSeek Harness.
 *
 * The plugin builds its own pi-ai provider, model catalog, key ring, balance
 * and group readers, then registers the route through the same public
 * `llm.registerAdapter` API the shipped adapters use. Nothing here reads the
 * profile's composition config, so installing the package is the whole setup:
 * the picker shows the models and the user only pastes API keys.
 *
 * This module only composes; each concern lives in its own module.
 *
 * @module dsh-apophiscode-api
 */

import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import { join } from 'node:path'

import z from '@deepseek-ai/schemastery'

import { createBalanceReader } from './balance.js'
import { createClaudeCliManager } from './claude-install.js'
import { createClaudeCliTransport } from './claude-cli-transport.js'
import { CLAUDE_TRANSPORTS, claudeTransportFor, DEFAULT_CLAUDE_TRANSPORT, readClaudeTransport } from './claude-transport.js'
import {
  CHANNEL,
  DEFAULT_API_HOST,
  DEFAULT_STATUS_HOST,
  DISPLAY_NAME,
  IMAGE_KEY_RECORD_ID,
  PLUGIN_ID,
  PROVIDER,
  SETTINGS_NAMESPACE,
} from './constants.js'
import { createDiagnostics } from './diagnostics.js'
import { createGroupReader } from './groups.js'
import { createImageController } from './image-settings.js'
import { createImageOriginalReader } from './image-originals.js'
import { createApophisCodeImageClient, createApophisCodeImageTool } from './images.js'
import { normalizeHost } from './hosts.js'
import { createKeyChooser } from './key-chooser.js'
import { ApophisCodeKeyRing } from './key-ring.js'
import { createModelSelectionController } from './model-selection.js'
import { createApophisCodePluginManager } from './plugin-version.js'
import { connectSettings, fieldValue, live, unwritable } from './preferences.js'
import { createRouteAdapter } from './route.js'
import { createModelProtocolResolver } from './model-protocol.js'
import { createApophisCodeRpc } from './rpc.js'
import { SEARCH_MODE_DEFAULT, SEARCH_MODES } from './search.js'
import { createProfileSearchComposition } from './search-composition.js'
import { createSearchController } from './search-controller.js'

export const name = PLUGIN_ID
/**
 * Only the model route is mandatory. `settings`, `web`, `connection`, and
 * `tools` are requested through `ctx.inject`: a profile without them (a
 * headless run, for one) must still boot with a working route instead of
 * blocking on a service it will never see.
 */
export const inject = ['llm', 'credentials']

/** Host overrides and preferences; a profile that never sets them keeps the defaults. */
export const Config = z.object({
  apiHost: z.string().default(DEFAULT_API_HOST),
  statusHost: z.string().default(DEFAULT_STATUS_HOST),
  /**
   * Web search routing: `default` leaves DSH's search alone, `auto` searches
   * through ApophisCode for ApophisCode sessions only, `apophiscode` for every
   * request DSH's own search would have served.
   */
  searchProvider: live(z.union([...SEARCH_MODES]).default(SEARCH_MODE_DEFAULT)),
  /** Exact active-key model ID; empty selects the first directory entry. */
  searchModel: live(z.string().default('')),
  /** Only the picker is filtered; an existing session can keep its model. */
  hiddenModels: live(z.array(z.string()).default([])),
  imageEnabled: live(z.boolean().default(true)),
  imageModel: live(z.string().default('')),
  imageQuality: live(z.string().default('auto')),
  /**
   * Auto and http use HTTP. Only an explicit cli preference selects the
   * isolated Claude Code transport; group membership never chooses it.
   */
  claudeTransport: live(z.union([...CLAUDE_TRANSPORTS]).default(DEFAULT_CLAUDE_TRANSPORT)),
  /** Path to the Claude Code CLI; empty means "the usual install places, then PATH". */
  claudeCliPath: live(z.string().default('')),
})

export function apply(ctx, config) {
  const ring = new ApophisCodeKeyRing(ctx.credentials)
  const imageRing = new ApophisCodeKeyRing(ctx.credentials, { recordId: IMAGE_KEY_RECORD_ID })

  // Read through on every call: on DSH 0.2 the preferences are volatile
  // references that change without restarting the plugin, and on 0.1.5 the
  // installed section replaces this source with its own.
  let source = () => ({
    apiHost: normalizeHost(config?.apiHost, DEFAULT_API_HOST),
    statusHost: normalizeHost(config?.statusHost, DEFAULT_STATUS_HOST),
    searchProvider: fieldValue(config?.searchProvider),
    searchModel: fieldValue(config?.searchModel),
    hiddenModels: fieldValue(config?.hiddenModels),
    imageEnabled: fieldValue(config?.imageEnabled),
    imageModel: fieldValue(config?.imageModel),
    imageQuality: fieldValue(config?.imageQuality),
    claudeTransport: fieldValue(config?.claudeTransport),
    claudeCliPath: fieldValue(config?.claudeCliPath),
  })
  const hosts = () => {
    const current = source() ?? {}
    return {
      apiHost: normalizeHost(current.apiHost, DEFAULT_API_HOST),
      statusHost: normalizeHost(current.statusHost, DEFAULT_STATUS_HOST),
    }
  }

  const balance = createBalanceReader({ listKeys: () => ring.secrets(), getHosts: hosts })
  const imageBalance = createBalanceReader({ listKeys: () => imageRing.secrets(), getHosts: hosts })
  /**
   * Read the active key's raw model directory on demand. Public group data
   * remains separate and never selects a request credential or transport.
   */
  const groups = createGroupReader({ listKeys: () => ring.secrets(), getActiveKey: () => ring.activeKey(), getHosts: hosts })
  const protocols = createModelProtocolResolver()
  const keys = createKeyChooser({ ring, logger: ctx.logger, onRotated: () => { balance.invalidate(); modelSelection.refresh() } })

  /** The session of the agent this turn runs for, when one is in scope. */
  const currentSession = () => {
    try {
      return ctx.get?.('agents')?.currentInitiator?.()?.session
    } catch {
      return undefined
    }
  }
  /** One Loader entry by row id, or undefined outside a Loader composition. */
  const loaderEntry = id => {
    try {
      return [...(ctx.get?.('loader')?.entries?.() ?? [])].find(entry => entry?.options?.id === id)
    } catch {
      return undefined
    }
  }
  const fallbackSessionId = `${PLUGIN_ID}-${randomUUID()}`
  const attachments = () => ctx.get?.('attachments') ?? ctx.attachments
  const modelPreference = { writable: false, set: undefined }
  let refreshModels = () => {}
  let modelHost = hosts().apiHost
  const reconcileModelHost = () => {
    const next = hosts().apiHost
    if (next === modelHost) return
    modelHost = next
    groups.invalidate()
    refreshModels()
  }
  const modelSelection = createModelSelectionController({
    availableModelIds: groups.availableModelIds,
    readPreference: () => source() ?? {},
    writePreference: patch => modelPreference.set(patch),
    isWritable: () => modelPreference.writable === true && typeof modelPreference.set === 'function',
    onChange: () => refreshModels(),
  })

  // ── the Claude Code CLI transport ─────────────────────────────────────────

  /**
   * Existing opt-in transport. Auto stays on HTTP; creating the manager does
   * not install or launch a CLI. DSH retains tools, permissions and history.
   */
  const claudeCli = createClaudeCliManager({ explicitPath: () => fieldValue(source()?.claudeCliPath) })
  const cliTransport = createClaudeCliTransport({
    binary: async () => {
      const found = await claudeCli.detect()
      if (typeof found.path !== 'string' || found.path === '') {
        throw Object.assign(new Error('Claude Code CLI is not installed'), { code: 'CLAUDE_CLI_MISSING' })
      }
      return found.path
    },
    version: () => claudeCli.lastDetection()?.version,
    logger: ctx.logger,
  })
  ctx.effect(() => () => { void cliTransport.close() }, 'apophiscode-api: Claude Code CLI processes')
  const claudePreference = { writable: false, set: undefined }
  const claudeTransportPreference = () => readClaudeTransport(source()?.claudeTransport)
  /** The explicitly selected Claude transport; group readings impose no policy. */
  const claudeTransportOf = keyId => claudeTransportFor({
    preference: claudeTransportPreference(),
    groups: keyId === undefined ? undefined : groups.groupsOf(keyId),
  })

  // ── the model route ───────────────────────────────────────────────────────

  // Every model runs DSH's native agent loop. Only an explicit preference
  // selects the Claude CLI; auto remains HTTP without probing group policy.
  const registration = ctx.llm.registerAdapter([PROVIDER], createRouteAdapter({
    ring, keys, protocols, getApiHost: () => hosts().apiHost, fallbackSessionId, resolveAttachments: attachments,
    isModelVisible: modelSelection.isVisible, availableModelIds: groups.availableModelIds, availableModels: groups.availableModels,
    claudeCli: Object.freeze({
      followsGroups: () => false,
      choose: ({ apiKey }) => claudeTransportOf(keys.idOf(apiKey)).transport === 'cli',
      fetch: (input, init, meta) => cliTransport.fetch(input, init, meta),
    }),
    resolveWorkingDirectory: sessionId => {
      const session = currentSession()
      // A background/title call for another session must not inherit the
      // foreground workspace. Read fresh metadata on every model request.
      return session && (sessionId === undefined || session.id === sessionId) ? session.header?.cwd : undefined
    },
  }))
  refreshModels = () => {
    // Atomic replacement announces the changed catalog to DSH's model
    // directories without unmounting the route or interrupting a turn.
    if (typeof registration?.replace === 'function') registration.replace([PROVIDER])
    else ctx.emit?.('llm/adapters-updated')
  }
  ctx.llm.registerConfigurableProviders([{
    provider: PROVIDER,
    displayName: DISPLAY_NAME,
    settingsNs: SETTINGS_NAMESPACE,
    settingsPath: [],
  }])

  // ── preferences and web search ────────────────────────────────────────────

  const hostPreference = unwritable('ApophisCode host overrides are not writable in this profile')
  const searchPreference = { writable: false, set: undefined }
  const imagePreference = { writable: false, set: undefined }
  const dshHome = typeof process.env.DSH_HOME === 'string' && process.env.DSH_HOME !== ''
    ? process.env.DSH_HOME
    : join(homedir(), '.dsh')
  const imageGroups = createGroupReader({ listKeys: () => imageRing.secrets(), getActiveKey: () => imageRing.activeKey(), getHosts: hosts })
  const images = createImageController({
    availableModels: imageGroups.availableModels,
    invalidateModels: imageGroups.invalidate,
    ring: imageRing,
    balance: imageBalance,
    readPreference: () => source() ?? {},
    writePreference: patch => imagePreference.set(patch),
    isWritable: () => imagePreference.writable === true && typeof imagePreference.set === 'function',
  })
  const imageClient = createApophisCodeImageClient({ resolveKey: () => imageRing.activeKey(), getHost: () => hosts().apiHost, availableModels: imageGroups.availableModels })
  const search = createSearchController({
    protocols,
    availableModels: groups.availableModels,
    ring,
    hosts,
    onKeyFailure: keys.onKeyFailure,
    readPreference: () => source() ?? {},
    writePreference: patch => searchPreference.set(patch),
    isWritable: () => searchPreference.writable === true && typeof searchPreference.set === 'function',
    resolveModelProvider: () => {
      try {
        return currentSession()?.requestContext?.()?.provider
      } catch {
        return undefined
      }
    },
    resolveSessionId: () => {
      const id = currentSession()?.id
      return typeof id === 'string' && id !== '' ? id : fallbackSessionId
    },
    webEntry: () => loaderEntry('web'),
    composition: createProfileSearchComposition({
      ctx,
      webEntry: () => loaderEntry('web'),
      dshHome,
      ownPackageJsonUrl: new URL('../package.json', import.meta.url),
    }),
    logger: ctx.logger,
  })

  ctx.inject(['settings'], settingsCtx => connectSettings(settingsCtx, {
    ctx,
    Config,
    namespace: SETTINGS_NAMESPACE,
    source: () => source(),
    setSource: next => { source = next },
    onChange: () => {
      balance.invalidate()
      imageBalance.invalidate()
      groups.invalidate()
      imageGroups.invalidate()
      reconcileModelHost()
      modelSelection.reconcile()
      void images.reconcile().catch(() => undefined)
      void search.reconcile()
    },
    hostPreference,
    searchPreference,
    modelPreference,
    imagePreference,
    claudePreference,
  }))
  // A volatile field changed (the ApophisCode panel, or a hand edit of the
  // profile patch): follow it without restarting the route.
  ctx.on?.('loader/volatile-update', () => {
    reconcileModelHost()
    modelSelection.reconcile()
    void images.reconcile().catch(() => undefined)
    void search.reconcile()
  })

  /**
   * Both search providers register with the web service whenever one exists.
   * Registration alone changes nothing; the preference decides whether the
   * profile patch points DSH at them.
   */
  ctx.inject(['web'], webCtx => {
    if (typeof webCtx.web?.registerSearchProvider !== 'function') return
    const scope = typeof webCtx.effect === 'function' ? webCtx : ctx
    search.register(webCtx.web, (callback, label) => scope.effect(callback, label))
  })

  // ── browser surface and native image tool  ───────────────────────────────

  void keys.remember().catch(() => undefined)

  /** One session's events from DSH's session query service, without projections. */
  const readSessionEvents = async (sessionId, signal) => {
    const query = ctx.get?.('sessionQuery')
    if (typeof query?.observeSession === 'function') {
      const observation = await query.observeSession(sessionId, { signal, projectionMode: 'none' })
      try { return [...observation.events] } finally { observation[Symbol.dispose]() }
    }
    if (typeof query?.readSession === 'function') return (await query.readSession(sessionId)).events
    return []
  }

  const handler = createApophisCodeRpc({
    ring,
    balance,
    groups,
    hosts,
    preference: hostPreference,
    pluginManager: createApophisCodePluginManager(),
    claude: Object.freeze({
      async status({ force = false } = {}) {
        return {
          ...(await claudeCli.status({ force })),
          transport: claudeTransportPreference(),
          writable: claudePreference.writable === true && typeof claudePreference.set === 'function',
          processes: cliTransport.stats(),
        }
      },
      install: () => claudeCli.install(),
      async update({ transport } = {}) {
        if (!CLAUDE_TRANSPORTS.includes(transport)) throw new Error('That ApophisCode Claude transport is not supported')
        if (claudePreference.writable !== true || typeof claudePreference.set !== 'function') throw new Error('ApophisCode settings are not writable in this profile')
        try {
          await claudePreference.set({ claudeTransport: transport })
        } catch {
          throw new Error('ApophisCode could not save the Claude transport')
        }
      },
      transportFor: names => claudeTransportFor({ preference: claudeTransportPreference(), groups: names }),
    }),
    search,
    modelSelection,
    images,
    imageOriginals: createImageOriginalReader({
      imageDirectory: join(dshHome, 'apophiscode-api', 'images'),
      getSessionEvents: readSessionEvents,
    }),
    diagnostics: createDiagnostics({
      sessionQuery: () => ctx.get?.('sessionQuery'),
      readEvents: readSessionEvents,
      ring,
      groups,
      secrets: async () => (await Promise.all([ring.secrets(), imageRing.secrets()])).flat().map(entry => entry.key),
      ownPackageJsonUrl: new URL('../package.json', import.meta.url),
    }),
  })
  /**
   * The shipped Connection getter retains its own service context, whose row
   * need not inject webServer. Register with our injected context explicitly:
   * a first hot install then mounts the channel without rebuilding Connection.
   * The native registry still owns admission and the wire protocol. Its
   * explicit-owner entry is internal, so retain the public RPC contract for
   * other Connection implementations. A headless profile can omit this scope.
   */
  ctx.inject(['connection', 'webServer'], connectionCtx => {
    const service = connectionCtx.connection
    connectionCtx.effect(
      () => typeof service.register === 'function'
        ? service.register(connectionCtx, CHANNEL, handler)
        : service.rpc.handle(CHANNEL, handler),
      'apophiscode-api: loopback account RPC',
    )
  })

  ctx.inject(['tools', 'attachments'], imageCtx => {
    const store = imageCtx.attachments
    if (typeof store?.saveImage !== 'function' || typeof store?.readImage !== 'function') return
    const scope = typeof imageCtx.effect === 'function' ? imageCtx : ctx
    scope.effect(() => images.mount(() => imageCtx.tools.register(createApophisCodeImageTool({
      client: imageClient,
      attachments: store,
      getPreference: images.preference,
      onGenerated: () => imageBalance.invalidate(),
      getSessionMessages: id => ctx.get?.('sessions')?.get?.(id)?.deriveMessages?.() ?? [],
      imageDirectory: join(dshHome, 'apophiscode-api', 'images'),
    }))), 'apophiscode-api: image tool availability')
  })
}

export { CLAUDE_MISSING_MESSAGE, CLAUDE_NPM_PACKAGE, claudeBinaryCandidates, DEFAULT_CLAUDE_CONFIG_DIR, locateClaudeBinary, resolveSpawnCommand } from './claude-binary.js'
export { baseUrlOf, CLI_SESSION_IDLE_MS, CLI_TOOL_NOTE, createClaudeCliTransport, describeRequest, dshSystemText, MAX_LIVE_CLI_SESSIONS, planContinuation } from './claude-cli-transport.js'
export { buildCliArgs, buildCliEnvironment, cliErrorMessage, startClaudeCliSession } from './claude-cli-session.js'
export { CLAUDE_INSTALL_COMMAND, createClaudeCliManager, explainNpmFailure, locateNpm, parseClaudeVersion } from './claude-install.js'
export { MCP_SERVER_NAME, MCP_TOOL_PREFIX, startClaudeMcpBridge, toolResultToMcp } from './claude-mcp-bridge.js'
export { buildTranscript, canonicalMessage, splitConversation } from './claude-transcript.js'
export { cliToolName, createClaudeToolNames } from './claude-tools.js'
export { CLAUDE_TRANSPORTS, claudeTransportFor, CLI_ONLY_GROUPS, DEFAULT_CLAUDE_TRANSPORT, HTTP_CLAUDE_GROUPS, readClaudeTransport } from './claude-transport.js'
export { createBalanceReader, parseTokenUsage } from './balance.js'
export { normalizeHost, statusHostOrder } from './hosts.js'
export { createApophisCodeCatalog } from './catalog.js'
export {
  CHANNEL,
  DEFAULT_API_HOST,
  DEFAULT_STATUS_HOST,
  DISPLAY_NAME,
  LEGACY_STATUS_HOSTS,
  PLUGIN_ID,
  PROVIDER,
  SETTINGS_NAMESPACE,
} from './constants.js'
export {
  classifyClientPolicy,
  classifyCliOutdated,
  classifyCliUnavailable,
  classifyGatewayFailure,
  classifyUpstreamServerError,
  classifyTestMessagePolicy,
  explainTestMessagePolicyFailure,
  TEST_MESSAGE_POLICY_CODE,
  explainClientPolicyFailure,
  explainCliClientPolicyFailure,
  explainCliOutdated,
  explainCliUnavailable,
  normalizeFailureMessage,
} from './failures.js'
export { createDiagnostics, DIAGNOSTICS_FORMAT, DIAGNOSTICS_LIMITS, summarizeSessionEvents } from './diagnostics.js'
export { catalogCoverage, createGroupReader, parseModelPlaza, parseKeyModels, pickKeyForModel } from './groups.js'
export { createKeyChooser } from './key-chooser.js'
export { createModelSelectionController, readHiddenModels } from './model-selection.js'
export { validateImageOptions } from './image-models.js'
export { createImageController, readImagePreference } from './image-settings.js'
export { createApophisCodeImageClient, createApophisCodeImageTool, decodeImagePng, IMAGE_TOOL_NAME, IMAGE_TIMEOUT_MS, MAX_IMAGE_BYTES, pngDimensions } from './images.js'
export { assertApiKey, ApophisCodeKeyRing } from './key-ring.js'
export { createApophisCodeProvider, guardKeyRotation } from './provider.js'
export { createApophisCodeProfile, createRouteAdapter } from './route.js'
export { createApophisCodeRpc } from './rpc.js'
export {
  buildSearchRequest,
  createApophisCodeAutoSearchProvider,
  createApophisCodeSearchProvider,
  APOPHISCODE_AUTO_SEARCH_PROVIDER_ID,
  APOPHISCODE_SEARCH_PROVIDER_ID,
  parseMessagesSearchResponse,
  parseResponsesSearchResponse,
  SEARCH_MODES,
} from './search.js'
export { createProfileSearchComposition, createSearchComposition } from './search-composition.js'
export { createSearchController, readSearchChoice } from './search-controller.js'
