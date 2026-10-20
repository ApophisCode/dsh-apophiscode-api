/** Validate request syntax; gateway-specific model and quality support is never guessed. */
export function validateImageQuality(quality) {
  if (typeof quality !== 'string' || quality.trim() === '' || quality.length > 64 || /[\u0000-\u001f\u007f]/u.test(quality)) throw new Error('ApophisCode image quality is invalid')
}

export function validateImageOptions({ model, quality = 'auto', size = 'auto', background = 'auto' } = {}) {
  if (typeof model !== 'string' || model.trim() === '' || /[\u0000-\u001f\u007f]/u.test(model)) throw new Error('ApophisCode images require a model from the active image key model list')
  validateImageQuality(quality)
  if (!['auto', 'transparent', 'opaque'].includes(background)) throw new Error('ApophisCode image background is not supported')
  if (size !== 'auto' && !(typeof size === 'string' && /^[1-9]\d{0,4}x[1-9]\d{0,4}$/u.test(size))) throw new Error('ApophisCode image size must be auto or widthxheight')
  return { model, quality, size, background }
}
