/**
 * WebApp Bridge Content Script
 * @description Runs on the ChainLinked web app domain (localhost / production)
 * to inject markers that allow the web app to detect the extension.
 * Registered in manifest.json with "world": "MAIN" so it shares the
 * page's JavaScript context.
 * @module extension/src/content/webapp-bridge
 */

// Inject global variable marker
;(window as Window & { __CHAINLINKED_EXTENSION__?: boolean }).__CHAINLINKED_EXTENSION__ = true

// Inject hidden DOM marker with version
const marker = document.createElement('div')
marker.id = 'chainlinked-extension-marker'
marker.setAttribute('data-version', chrome?.runtime?.getManifest?.()?.version ?? 'unknown')
marker.style.display = 'none'
document.documentElement.appendChild(marker)

// Listen for ping events from the web app and respond with pong
window.addEventListener('chainlinked-extension-ping', () => {
  window.dispatchEvent(new CustomEvent('chainlinked-extension-pong'))
})

console.log('[ChainLinked Extension] WebApp bridge loaded')
