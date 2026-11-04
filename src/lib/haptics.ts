export function vibrate(pattern: number | number[] = 12): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* ignore */
  }
}

export function hapticSuccess(): void {
  vibrate([10, 40, 12]);
}

export function hapticError(): void {
  vibrate([24, 60, 24]);
}

export function hapticTap(): void {
  vibrate(8);
}
