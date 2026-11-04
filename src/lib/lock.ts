const LOCK_SESSION_KEY = 'admh2_unlocked';
const ITERATIONS = 150000;

function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function randomSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bufferToBase64(bytes.buffer);
}

async function derive(pin: string, salt: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: base64ToBuffer(salt), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bufferToBase64(bits);
}

export async function createPinHash(pin: string): Promise<{ hash: string; salt: string }> {
  const salt = randomSalt();
  return { hash: await derive(pin, salt), salt };
}

export async function verifyPin(pin: string, hash: string, salt: string): Promise<boolean> {
  try {
    const candidate = await derive(pin, salt);
    if (candidate.length !== hash.length) return false;
    let mismatch = 0;
    for (let i = 0; i < candidate.length; i += 1) mismatch |= candidate.charCodeAt(i) ^ hash.charCodeAt(i);
    return mismatch === 0;
  } catch {
    return false;
  }
}

export function isSessionUnlocked(): boolean {
  try {
    return sessionStorage.getItem(LOCK_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function markSessionUnlocked(): void {
  try {
    sessionStorage.setItem(LOCK_SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function lockSession(): void {
  try {
    sessionStorage.removeItem(LOCK_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
