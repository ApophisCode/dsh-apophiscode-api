/** Authored update errors shared by the host and localized settings page. */
export const UPDATE_ERRORS = Object.freeze({
  versionUpdateInstallerFailed: 'ApophisCode plugin update could not start the installer',
  versionUpdateNetworkFailed: 'ApophisCode plugin update could not reach the package registry',
  versionUpdatePermissionFailed: 'ApophisCode plugin update could not write to the plugin directory',
  versionUpdateDiskFull: 'ApophisCode plugin update ran out of disk space',
  versionUpdateTimedOut: 'ApophisCode plugin update timed out',
  versionUpdateNotInstalled: 'ApophisCode plugin update did not install the requested version',
  versionUpdateCheckFailed: 'ApophisCode plugin version check failed',
})

/** Unknown errors never expose installer output or host paths in the UI. */
export function updateFailureCopy(error) {
  return Object.keys(UPDATE_ERRORS).find(key => UPDATE_ERRORS[key] === error?.message) ?? 'versionUpdateFailed'
}

/** Classify only known error tokens; raw output remains on the host. */
export function installerFailure(result) {
  const output = `${result?.code ?? ''}\n${result?.stdout ?? ''}\n${result?.stderr ?? ''}`
  if (/\b(?:EACCES|EPERM)\b|permission denied/iu.test(output)) return UPDATE_ERRORS.versionUpdatePermissionFailed
  if (/\bENOSPC\b/iu.test(output)) return UPDATE_ERRORS.versionUpdateDiskFull
  if (/\b(?:ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ERR_PNPM_META_FETCH_FAIL|ERR_PNPM_FETCH_FAIL)\b/iu.test(output)) {
    return UPDATE_ERRORS.versionUpdateNetworkFailed
  }
  return 'ApophisCode plugin update failed'
}
