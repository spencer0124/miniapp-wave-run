import { haptic as sdkHaptic, type HapticStyle } from '@skkuverse/miniapp';

/**
 * A buzz from the app's native haptics. In a plain browser there is no shell,
 * so a phone that supports the Vibration API (Android, not iOS Safari) gets a
 * short pulse for the strong cue only; milestones stay silent there.
 */
export function haptic(style: HapticStyle): void {
  sdkHaptic(style, style === 'heavy' ? { vibrate: 40 } : undefined);
}
