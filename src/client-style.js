/**
 * The settings panel's stylesheet, built only from DSH design tokens so it
 * follows the host theme (light and dark) and matches the host's own settings
 * pages: settings cards, hairline-divided rows, 0.5px tags, layer-1 inputs.
 * Fallbacks cover hosts that predate the settings-card tokens.
 *
 * @module dsh-apophiscode-api/client-style
 */

export const STYLE = `
.apc{display:flex;flex-direction:column;gap:16px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:22px}
.apc-intro{margin:0;color:var(--dsw-alias-label-tertiary)}
.apc-card{display:flex;flex-direction:column;gap:14px;padding:16px 18px;border:.5px solid var(--dsw-alias-settings-card-stroke,var(--dsw-alias-border-l4,rgba(127,127,127,.3)));border-radius:var(--dsw-radius-xl,20px);background:var(--dsw-alias-settings-card-fill,var(--dsw-alias-bg-layer-2))}
.apc-head{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:28px}
.apc-title{display:flex;align-items:center;gap:8px;margin:0;font-size:15px;font-weight:600;line-height:22px}
.apc-note{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.apc-link{color:var(--dsw-alias-link,#3964fe);font-weight:500;text-decoration:none;word-break:break-all}
.apc-link:hover,.apc-link:focus{outline:none;text-decoration:underline dotted var(--dsw-alias-link,#3964fe);text-underline-offset:3px}
.apc-warn{margin:0;color:var(--dsw-alias-state-warn-label,#dd8629);font-size:12px;line-height:18px}
.apc-error{margin:0;color:var(--dsw-alias-state-error-primary,#ec1313);font-size:12px;line-height:18px}
.apc-label{color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px}
.apc-mono{font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:12px;word-break:break-all}
.apc-detail{margin:0;padding:8px 10px;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-markdown-code-block);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;white-space:pre-wrap;word-break:break-all;max-height:160px;overflow:auto}

.apc-btn{box-sizing:border-box;display:inline-flex;flex:none;align-items:center;justify-content:center;gap:4px;height:28px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-sm,8px);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;white-space:nowrap;cursor:pointer}
.apc-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.apc-btn:active:not(:disabled){background:var(--dsw-alias-interactive-bg-active)}
.apc-btn:disabled{opacity:.4;cursor:not-allowed}
.apc-btn[data-size=md]{height:32px;padding:0 14px;border-radius:var(--dsw-radius-md,12px);font-size:13px}
.apc-btn[data-variant=primary]{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.apc-btn[data-variant=primary]:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover)}
.apc-btn[data-variant=ghost]{border-color:transparent;color:var(--dsw-alias-label-secondary)}
.apc-btn[data-variant=danger]{border-color:transparent;color:var(--dsw-alias-state-error-primary)}
.apc-btn[data-variant=danger]:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger)}

.apc-input{box-sizing:border-box;flex:1 1 200px;min-width:0;height:32px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;outline:none}
.apc-input:focus{border-color:var(--dsw-alias-state-business-primary)}
.apc-input::placeholder{color:var(--dsw-alias-label-caption)}
.apc-input:disabled{opacity:.5}
.apc-diag-session{flex:1 1 260px;max-width:480px;cursor:pointer}
.apc-diag-text{width:100%;height:auto;min-height:220px;padding:8px 10px;line-height:18px;resize:vertical;white-space:pre;overflow:auto}
.apc-image-choice{flex:none;width:100%;max-width:300px;cursor:pointer}
.apc-image-shortcut{display:inline-flex;align-items:center;gap:8px}
.apc-quota{position:relative;display:inline-flex;align-items:center}
.apc-quota-value{cursor:help;border-radius:var(--dsw-radius-xs,4px)}
.apc-quota-value:focus-visible{outline:1px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.apc-quota-tooltip{position:absolute;bottom:calc(100% + 8px);left:0;z-index:100;box-sizing:border-box;width:max-content;max-width:min(320px,calc(100vw - 32px));padding:10px 12px;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:var(--dsw-shadow-lv1);font-size:12px;line-height:20px;white-space:pre-line;overflow-wrap:anywhere;visibility:hidden;opacity:0;pointer-events:none}
.apc-quota[data-align=end]>.apc-quota-tooltip{left:auto;right:0}
.apc-quota:hover>.apc-quota-tooltip,.apc-quota:focus-within>.apc-quota-tooltip{visibility:visible;opacity:1}
.apc-image-result,.apc-image-chat{display:flex;flex-direction:column;gap:10px;padding:8px 0}
.apc-generated-image{display:grid;place-items:center;align-self:flex-start;max-width:100%;width:320px;min-height:80px;padding:0;overflow:hidden;border:.5px solid var(--dsw-alias-border-l3);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);cursor:zoom-in}
.apc-generated-image img{display:block;max-width:100%;max-height:480px;object-fit:contain}
.apc-image-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:rgba(0,0,0,.84);box-sizing:border-box}
.apc-image-viewer{display:flex;flex-direction:column;box-sizing:border-box;width:100%;height:100%;min-height:0;color:#f5f5f5;font:13px/1.5 var(--ds-font-family,system-ui,sans-serif)}
.apc-image-viewer-toolbar{display:flex;align-items:center;gap:8px;flex:0 0 auto;min-height:40px;margin-bottom:12px}
.apc-image-viewer-name{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.75)}
.apc-image-viewer-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;box-sizing:border-box;flex:none;height:36px;padding:0 12px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(255,255,255,.08);color:#f5f5f5;font:inherit;cursor:pointer;white-space:nowrap}
.apc-image-viewer-button:hover:not(:disabled){background:rgba(255,255,255,.18)}
.apc-image-viewer-button:focus-visible{outline:2px solid #a7c3ff;outline-offset:2px}
.apc-image-viewer-button:disabled{opacity:.55;cursor:wait}
.apc-image-viewer-close{width:36px;padding:0;border-color:transparent;background:transparent}
.apc-image-viewer-canvas{display:flex;align-items:center;justify-content:center;flex:1;min-height:0;overflow:hidden}
.apc-image-viewer-canvas img{display:block;flex:none;width:auto;height:auto;max-width:100%;max-height:100%;min-width:0;min-height:0;object-fit:contain}
.apc-image-viewer-error{align-self:center;flex:none;margin:12px 0 0;padding:8px 12px;border-radius:8px;background:#4d2222;color:#ffd3d3;text-align:center}
.apc-form{display:flex;flex-wrap:wrap;align-items:center;gap:8px}

.apc-chip{flex:none;padding:0 8px;border-radius:999px;font-size:11px;font-weight:500;line-height:18px;white-space:nowrap}
.apc-chip[data-tone=success]{background:var(--dsw-alias-state-success-tertiary);color:var(--dsw-alias-state-success-primary)}
.apc-chip[data-tone=danger]{background:var(--dsw-alias-interactive-bg-hover-danger);color:var(--dsw-alias-state-error-primary)}
.apc-chip[data-tone=info]{background:var(--dsw-alias-state-business-tertiary);color:var(--dsw-alias-state-business-primary)}
.apc-chip[data-tone=neutral]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.apc-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.apc-dot[data-tone=success]{background:var(--dsw-alias-state-success-primary)}
.apc-dot[data-tone=warn]{background:var(--dsw-alias-state-warn-primary)}
.apc-dot[data-tone=danger]{background:var(--dsw-alias-state-error-primary)}


.apc-list{display:flex;flex-direction:column}
.apc-row{display:flex;flex-direction:column;gap:8px;padding:12px 0;border-top:.5px solid var(--dsw-alias-border-l2)}
.apc-row:first-child{border-top:0;padding-top:2px}
.apc-row-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 12px}
.apc-row-name{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-width:0;font-weight:500}
.apc-row-name>.apc-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.apc-actions{display:flex;flex-wrap:wrap;gap:4px}
.apc-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px;font-variant-numeric:tabular-nums}
.apc-figures{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 16px;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.apc-figures b{margin-left:4px;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.apc-bar{height:4px;overflow:hidden;border-radius:999px;background:var(--dsw-alias-interactive-bg-active)}
.apc-bar>span{display:block;height:100%;border-radius:inherit;background:var(--dsw-alias-state-success-primary)}
.apc-bar[data-level=warn]>span{background:var(--dsw-alias-state-warn-primary)}
.apc-bar[data-level=low]>span{background:var(--dsw-alias-state-error-primary)}
.apc-add{display:flex;flex-direction:column;gap:8px;padding-top:14px;border-top:.5px solid var(--dsw-alias-border-l2)}

.apc-models{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0;padding:0;min-width:0;border:0}
.apc-model{display:flex;align-items:center;gap:10px;min-width:0;padding:10px 12px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-interactive-bg-hover);cursor:pointer}
.apc-model>input{flex:none;width:16px;height:16px;margin:0;accent-color:var(--dsw-alias-state-business-primary)}
.apc-model>span{display:flex;flex-direction:column;min-width:0;gap:2px}
.apc-model b{font-size:13px;font-weight:500}
.apc-models:disabled .apc-model{opacity:.5;cursor:not-allowed}

.apc-setting{display:grid;grid-template-columns:112px minmax(0,1fr);gap:6px 16px;align-items:start}
.apc-setting>.apc-label{padding-top:5px}
.apc-setting>div{display:flex;flex-direction:column;gap:6px;min-width:0}
.apc-seg{display:inline-flex;flex-wrap:wrap;align-self:flex-start;gap:2px;max-width:100%;padding:2px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-interactive-bg-hover)}
.apc-seg>button{height:28px;padding:0 12px;border:0;border-radius:calc(var(--dsw-radius-md,12px) - 2px);background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;line-height:18px;cursor:pointer}
.apc-seg>button:hover:not(:disabled):not([aria-checked=true]){color:var(--dsw-alias-label-primary)}
.apc-seg>button[aria-checked=true]{background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);font-weight:500;box-shadow:var(--dsw-shadow-lv1)}
.apc-seg>button:disabled{cursor:not-allowed;opacity:.5}
.apc-status{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;font-size:13px}
.apc-status>b{font-weight:600;font-variant-numeric:tabular-nums}
.apc-callout{display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-state-warn-tertiary)}
.apc-callout[data-tone=info]{background:var(--dsw-alias-state-business-tertiary)}
.apc-callout>.apc-title{font-size:13px}
.apc-split{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px}

.apc-advanced>summary{width:fit-content;padding:2px 4px;margin-left:-4px;border-radius:var(--dsw-radius-sm,8px);color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:18px;cursor:pointer}
.apc-advanced>summary:hover{background:var(--dsw-alias-interactive-bg-hover)}
.apc-advanced[open]>summary{margin-bottom:10px}
.apc-field{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}

.apc-composer{display:inline-flex;flex:0 0 auto;align-items:center;box-sizing:border-box;height:28px;color:var(--dsw-alias-label-secondary);font-size:12px;font-weight:500;line-height:20px;font-variant-numeric:tabular-nums;white-space:nowrap;user-select:none}

@media (max-width:640px){
  .apc-setting{grid-template-columns:1fr}
  .apc-models{grid-template-columns:1fr}
  .apc-setting>.apc-label{padding-top:0}
}
`
