/**
 * Background Sync Diagnostic Test
 *
 * HOW TO USE (Service Worker Console — RECOMMENDED):
 * 1. Load the extension as unpacked in Chrome (chrome://extensions)
 * 2. Make sure you're logged into LinkedIn in the same browser
 * 3. Open the service worker console:
 *    - Go to chrome://extensions → Find the extension → Click "service worker" link
 * 4. Paste this entire script into the console and press Enter
 *
 * ALTERNATIVE (from any extension page like the popup):
 *   chrome.runtime.sendMessage({ type: 'BACKGROUND_SYNC_DIAGNOSTIC' }, r => console.log(r));
 */

(async () => {
  console.log('=== Background Sync Diagnostic ===\n');

  // We're in the service worker console — call the exposed diagnostic directly
  if (typeof self.__bgSync === 'undefined') {
    console.error('self.__bgSync not found. Make sure you rebuilt the extension (npm run build:scripts) and reloaded it.');
    return;
  }

  try {
    const steps = await self.__bgSync.diagnostic();
    let allPassed = true;

    for (const step of steps) {
      const icon = step.passed ? 'PASS' : 'FAIL';
      const style = step.passed ? 'color: green' : 'color: red; font-weight: bold';
      console.log(`%c[${icon}] ${step.step}`, style);
      console.log(`       ${step.detail}`);
      if (step.data) {
        console.log('       Data:', step.data);
      }
      console.log('');
      if (!step.passed) allPassed = false;
    }

    console.log('---');
    if (allPassed) {
      console.log('%c ALL TESTS PASSED — Background sync will work!', 'color: green; font-weight: bold; font-size: 14px');
    } else {
      console.log('%c SOME TESTS FAILED — Check the FAIL items above', 'color: red; font-weight: bold; font-size: 14px');
    }

    // Also show current sync state
    console.log('\n=== Current Sync State ===');
    const state = await self.__bgSync.status();
    console.log('Last sync:', state.lastSyncTime ? new Date(state.lastSyncTime).toLocaleString() : 'never');
    console.log('Last success:', state.lastSyncSuccess);
    console.log('Consecutive failures:', state.consecutiveFailures);
    console.log('Circuit breaker:', state.circuitBreakerTripped ? 'TRIPPED' : 'OK');
    console.log('Next sync:', state.nextSyncTime ? new Date(state.nextSyncTime).toLocaleString() : 'not scheduled');
    console.log('Total syncs:', state.totalSyncs);
    console.log('History entries:', state.syncHistory?.length ?? 0);

    console.log('\n=== Sync Config ===');
    const config = await self.__bgSync.config();
    console.log('Enabled:', config.enabled);
    console.log('Base interval:', config.baseIntervalMinutes, 'min');
    console.log('Max API calls/cycle:', config.maxApiCallsPerSync);
    console.log('Endpoints:', config.endpoints);

    console.log('\n=== Quick Commands ===');
    console.log('  self.__bgSync.enable()     — enable sync');
    console.log('  self.__bgSync.disable()    — disable sync');
    console.log('  self.__bgSync.trigger()    — manual sync now');
    console.log('  self.__bgSync.status()     — check state');
    console.log('  self.__bgSync.reset()      — reset circuit breaker');
    console.log('  self.__bgSync.diagnostic() — re-run this test');

  } catch (error) {
    console.error('Diagnostic failed:', error);
  }
})();
