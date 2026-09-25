import type { WebToAppMessage } from './types';

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage(message: string): void;
    };
  }
}

/**
 * Send a typed message from the web layer to the React Native app.
 * No-ops gracefully when not running inside a WebView.
 *
 * Local to this repository rather than vendored. `types.ts` is the contract
 * both sides agree on; this is the browser-side binding to it, and the app has
 * its own. The receiving half, `parseWebMessage`, has no caller here — the web
 * side only sends.
 */
export function postToApp(msg: WebToAppMessage): void {
  window.ReactNativeWebView?.postMessage(JSON.stringify(msg));
}
