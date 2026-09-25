import { postToApp } from '@skkuverse/bridge';

type HapticStyle = 'light' | 'medium' | 'heavy';

/**
 * A buzz from the app's native haptics. In a plain browser there is no shell,
 * so a phone that supports the Vibration API (Android, not iOS Safari) gets a
 * short pulse for the strong cue only; milestones stay silent there.
 */
export function haptic(style: HapticStyle): void {
  if (window.ReactNativeWebView) {
    postToApp({ type: 'web:haptic', style });
    return;
  }
  if (style === 'heavy') navigator.vibrate?.(40);
}
