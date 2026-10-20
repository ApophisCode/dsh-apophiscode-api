import * as react from 'react'

import { IMAGE_CHAT_KIND, imageConversationNode } from './image-conversation.js'
import { KeyBalance } from './client-balance.jsx'
import { ImageShortcutBalance } from './client-image-balance.jsx'
import { readOriginalImage } from './client-image-download.js'
import { createImageViewer, ApophisCodeImageViewer } from './client-image-viewer.jsx'
import { KeyRenameForm, useKeyRename } from './client-key-rename.jsx'

const imageModelLabel = id => id

/** Only projections come back from the host; the password draft is cleared on success. */
export function ApophisCodeImagesCard({ call, t }) {
  const [state, setState] = react.useState()
  const [draft, setDraft] = react.useState({ key: '', label: '' })
  const [busy, setBusy] = react.useState(false)
  const [error, setError] = react.useState()
  const [balance, setBalance] = react.useState()
  const [balanceError, setBalanceError] = react.useState()
  const [balanceLoading, setBalanceLoading] = react.useState(true)
  const balanceGeneration = react.useRef(0)
  const mounted = react.useRef(false)
  const readBalance = async (force = false) => {
    if (!mounted.current) return
    const generation = ++balanceGeneration.current
    setBalanceLoading(true)
    setBalanceError(undefined)
    try {
      const value = await call('images/balance', { force })
      if (mounted.current && balanceGeneration.current === generation) setBalance(value)
    } catch (failure) {
      if (mounted.current && balanceGeneration.current === generation) setBalanceError(String(failure?.message ?? t('imagesBalanceFailed')).slice(0, 200))
    } finally {
      if (mounted.current && balanceGeneration.current === generation) setBalanceLoading(false)
    }
  }
  react.useEffect(() => {
    mounted.current = true
    call('images/status').then(value => { if (mounted.current) setState(value) })
      .catch(() => { if (mounted.current) setError(t('imagesLoadFailed')) })
    void readBalance()
    const timer = window.setInterval(() => { void readBalance() }, 60_000)
    return () => { mounted.current = false; balanceGeneration.current += 1; window.clearInterval(timer) }
  }, [call, t])
  const mutate = async (endpoint, payload = {}) => {
    setBusy(true)
    setError(undefined)
    try {
      const value = await call(endpoint, payload)
      if (mounted.current) setState(value)
      if (mounted.current && endpoint.startsWith('images/keys/')) {
        setBalance(undefined)
        void readBalance(true)
      }
      window.dispatchEvent(new Event('apophiscode-images-updated'))
      return true
    } catch (failure) {
      if (mounted.current) setError(String(failure?.message ?? t('imagesLoadFailed')).slice(0, 200))
      return false
    } finally { if (mounted.current) setBusy(false) }
  }
  const rename = useKeyRename(({ id, label }) => mutate('images/keys/rename', { id, label }))
  const disabled = busy || state?.writable !== true
  const models = state?.models ?? []
  const qualities = [...new Set([...(models.find(model => model.id === state?.imageModel)?.qualities ?? ['auto']), state?.imageQuality ?? 'auto'])]
  const rows = (state?.keys ?? []).map(entry => balance?.keys?.find(row => row.id === entry.id) ?? { id: entry.id })
  return <section className="apc-card">
    {state?.modelError && <p className="apc-error" role="alert">{state.modelError}</p>}
    <header className="apc-head"><h3 className="apc-title">{t('imagesTitle')}</h3><span className="apc-actions">
      <button className="apc-btn" type="button" disabled={busy || balanceLoading} onClick={() => { void readBalance(true) }}>{balanceLoading ? t('refreshing') : t('refresh')}</button>
    </span></header>
    <p className="apc-note">{t('imagesIntro')}</p>
    {state !== undefined && <>
      <label className="apc-setting"><span className="apc-label">{t('imagesEnabled')}</span>
        <select className="apc-input apc-image-choice" value={String(state.imageEnabled)} disabled={disabled}
          onChange={event => { void mutate('images/update', { imageEnabled: event.target.value === 'true' }) }}>
          <option value="true">{t('imagesOn')}</option><option value="false">{t('imagesOff')}</option>
        </select>
      </label>
      <label className="apc-setting"><span className="apc-label">{t('imagesModel')}</span>
        <select className="apc-input apc-image-choice" value={state.imageModel} disabled={disabled || !state.imageEnabled}
          onChange={event => { void mutate('images/update', { imageModel: event.target.value }) }}>
          <option value="">{t('imagesModelDefault')}</option>
          {models.map(model => <option key={model.id} value={model.id}>{imageModelLabel(model.id)}</option>)}
        </select>
      </label>
      <label className="apc-setting"><span className="apc-label">{t('imagesQuality')}</span>
        <select className="apc-input apc-image-choice" value={state.imageQuality} disabled={disabled || !state.imageEnabled}
          onChange={event => { void mutate('images/update', { imageQuality: event.target.value }) }}>
          {qualities.map(quality => <option key={quality} value={quality}>{t(`imagesQuality_${quality}`)}</option>)}
        </select>
      </label>
      <p className="apc-note">{t('imagesQualityHint')}</p>
      {(state.keys ?? []).length > 0 && <p className="apc-note">{balanceLoading ? t('imagesBalanceLoading') : t('imagesBalanceHint')}</p>}
      <div className="apc-list">
        {(state.keys ?? []).map(entry => <div className="apc-row" key={entry.id}>
          <div className="apc-row-top"><span className="apc-row-name">
            {rename.renaming?.id === entry.id ? <KeyRenameForm rename={rename} busy={busy} t={t} /> : <span className="apc-name">{entry.label}</span>}
            {entry.active && <span className="apc-chip" data-tone="success">{t('keyActive')}</span>}
          </span>{rename.renaming?.id !== entry.id && <span className="apc-actions">
            {!entry.active && <button className="apc-btn" type="button" disabled={busy} onClick={() => { void mutate('images/keys/select', { id: entry.id }) }}>{t('keyUse')}</button>}
            <button className="apc-btn" data-variant="ghost" type="button" disabled={busy} onClick={() => rename.start(entry)}>{t('keyRename')}</button>
            <button className="apc-btn" data-variant="danger" type="button" disabled={busy} onClick={() => { void mutate('images/keys/remove', { id: entry.id }) }}>{t('keyRemove')}</button>
          </span>}</div>
          <KeyBalance row={rows.find(row => row.id === entry.id)} t={t} />
        </div>)}
      </div>
      {(state.keys ?? []).length === 0 && <p className="apc-note">{t('imagesNoKey')}</p>}
      <form className="apc-add" onSubmit={event => {
        event.preventDefault()
        if (busy || draft.key.trim() === '') return
        void mutate('images/keys/add', draft).then(saved => { if (saved && mounted.current) setDraft({ key: '', label: '' }) })
      }}>
        <span className="apc-label">{t('imagesAddKey')}</span><div className="apc-form">
          <input className="apc-input" type="password" autoComplete="off" aria-label={t('imagesAddKey')} placeholder={t('imagesKeyPlaceholder')}
            value={draft.key} disabled={busy} onChange={event => setDraft(current => ({ ...current, key: event.target.value }))} />
          <input className="apc-input" type="text" maxLength={60} aria-label={t('addLabelPlaceholder')} placeholder={t('addLabelPlaceholder')}
            value={draft.label} disabled={busy} onChange={event => setDraft(current => ({ ...current, label: event.target.value }))} />
          <button className="apc-btn" data-variant="primary" data-size="md" type="submit" disabled={busy || draft.key.trim() === ''}>{t('add')}</button>
        </div>
      </form>
      {!state.available && <p className="apc-note">{t('imagesUnavailable')}</p>}
      {!state.writable && <p className="apc-note">{t('searchNotWritable')}</p>}
    </>}
    {error !== undefined && <p className="apc-error" role="alert">{error}</p>}
    {balanceError !== undefined && <p className="apc-error" role="alert">{`${t('imagesBalanceFailed')}: ${balanceError}`}</p>}
  </section>
}

/** A draft shortcut names this provider explicitly when other image tools exist. */
export function ApophisCodeImageShortcut({ call, t, directory, prepare }) {
  const snapshot = react.useSyncExternalStore(listener => directory.subscribe(listener), () => directory.getSnapshot())
  const active = snapshot?.current?.provider === 'apophiscode'
  const [ready, setReady] = react.useState(false)
  const [error, setError] = react.useState()
  react.useEffect(() => {
    let live = true
    let generation = 0
    const refresh = () => {
      if (!active) return
      const current = ++generation
      void call('images/status').then(value => {
        if (live && current === generation) setReady(value.imageEnabled && value.available && value.keys.some(key => !key.disabled))
      }).catch(() => { if (live && current === generation) setReady(false) })
    }
    setReady(false)
    refresh()
    window.addEventListener('apophiscode-images-updated', refresh)
    return () => { live = false; window.removeEventListener('apophiscode-images-updated', refresh) }
  }, [call, active])
  if (!active || !ready) return null
  return <span className="apc-image-shortcut"><button className="apc-btn" type="button" title={t('imagesShortcutHint')} onClick={() => {
    try { prepare(t('imagesDraft')); setError(undefined) } catch { setError(t('imagesDraftBusy')) }
  }}>{t('imagesCreate')}</button><ImageShortcutBalance call={call} t={t} />{error && <span className="apc-error" role="alert">{error}</span>}</span>
}

function GeneratedImage({ attachment, loadImage, openImage, t }) {
  const [url, setUrl] = react.useState()
  const [failed, setFailed] = react.useState(false)
  const [attempt, setAttempt] = react.useState(0)
  react.useEffect(() => {
    let live = true
    setUrl(undefined)
    setFailed(false)
    Promise.resolve().then(() => loadImage(attachment)).then(value => { if (live) setUrl(value) }, () => { if (live) setFailed(true) })
    return () => { live = false }
  }, [attachment, loadImage, attempt])
  return <button className="apc-generated-image" type="button" title={t('imagesOpen')} aria-label={t('imagesOpen')}
    disabled={!url && !failed} onClick={event => {
      if (failed) { setAttempt(value => value + 1); return }
      openImage(url, attachment, event.currentTarget)
    }}>
    {url ? <img src={url} alt={attachment.name ?? t('imagesTitle')} /> : <span>{failed ? t('imagesRetryPreview') : t('imagesLoadingPreview')}</span>}
  </button>
}

export function ApophisCodeImageResult({ block, t, loadImage, openImage }) {
  const settled = block?.kind === 'tool-result'
  const failed = settled && block.isError === true
  const images = settled ? (block.content ?? []).filter(part => part.type === 'image' && part.attachment) : []
  const error = failed ? block.content?.find(part => part.type === 'text')?.text : undefined
  return <div className="apc-image-result">
    <div className="apc-status"><b>{t('imagesTitle')}</b><span className="apc-meta">ApophisCode · {t(!settled ? 'imagesGenerating' : failed ? 'imagesFailed' : 'imagesDone')}</span></div>
    {images.map(part => <GeneratedImage key={part.attachment.attachmentId} attachment={part.attachment} t={t} loadImage={loadImage} openImage={openImage} />)}
    {typeof block?.meta?.requestedModel === 'string' && <p className="apc-meta">{block.meta.requestedModel} · {String(block.meta.requestedQuality ?? 'auto')} · {block.meta.width} × {block.meta.height}</p>}
    {error && <p className="apc-error" role="alert">{error}</p>}
  </div>
}

function ImageChatOutput({ node, ...props }) {
  return <div className="apc-image-chat">{node.data.blocks.map(block => <ApophisCodeImageResult key={block.toolCallId} block={block} {...props} />)}</div>
}

export function installImagePresentation(ctx, t, call) {
  ctx.inject(['uiConversation'], scope => {
    const conversation = scope.get('uiConversation')
    if (typeof conversation?.events?.register !== 'function' || typeof conversation?.imageUrl !== 'function') return
    const viewer = createImageViewer()
    scope.effect(() => () => viewer.dispose(), 'apophiscode-api: image viewer')
    scope.slots.inject('shell.overlay', () => scope.slots.register({
      name: 'shell.overlay', id: 'apophiscode-image-viewer', order: 21,
      inject: () => ({ viewer, t }),
    }, ApophisCodeImageViewer))
    const imageProps = sessionId => ({
      t,
      loadImage: attachment => conversation.imageUrl(sessionId, attachment),
      openImage: (src, attachment, opener) => {
        viewer.open({ src, attachment, opener,
          readOriginal: options => readOriginalImage(call, sessionId, attachment.attachmentId, options),
        })
      },
    })
    scope.effect(() => conversation.events.register(imageConversationNode), 'apophiscode-api: image results in chat')
    scope.slots.inject('conversation.chat.node', () => scope.slots.register({ name: 'conversation.chat.node', key: IMAGE_CHAT_KIND, inject: imageProps }, ImageChatOutput))
    scope.slots.inject('tool.call.toolview', () => scope.slots.register({ name: 'tool.call.toolview', key: 'apophiscode_image_generate', inject: imageProps }, ApophisCodeImageResult))
  })
}
