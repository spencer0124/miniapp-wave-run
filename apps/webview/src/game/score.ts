const HI_KEY = 'wave-run:hi';

// Storage can throw (private mode, a WebView with storage off) or come back
// empty; the game must play the same either way, so every access is guarded.

export function loadHighScore(): number {
  try {
    const n = Number(localStorage.getItem(HI_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HI_KEY, String(score));
  } catch {
    // Kept for this session only.
  }
}

/** Zero-padded to five digits, the way the original shows it. */
export function formatScore(score: number): string {
  return String(Math.min(99999, Math.max(0, Math.floor(score)))).padStart(5, '0');
}
