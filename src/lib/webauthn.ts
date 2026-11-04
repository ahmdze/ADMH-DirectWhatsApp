import {
  NATIVE_BIOMETRIC_SENTINEL,
  isNativeBiometricsAvailable,
  isNativePlatform,
  registerNativeBiometric,
  verifyNativeBiometric
} from './native-biometric';

function randomChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

/**
 * Biometric availability.
 * Native (Capacitor Android/iOS): enrolled biometrics through the OS prompt.
 * Web: a platform authenticator through WebAuthn.
 */
export async function biometricAvailable(): Promise<boolean> {
  if (isNativePlatform()) return isNativeBiometricsAvailable();
  try {
    if (typeof PublicKeyCredential === 'undefined') return false;
    if (!(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Register biometric unlock.
 * Native returns the `native-biometric` sentinel (the OS prompt is the gate; no
 * secret is stored). Web returns the WebAuthn credential id.
 */
export async function registerBiometric(label: string): Promise<string | null> {
  if (isNativePlatform()) return registerNativeBiometric();
  try {
    if (!(await biometricAvailable())) return null;
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: randomChallenge(),
        rp: { name: 'ADMH Direct WhatsApp', id: location.hostname },
        user: {
          id: crypto.getRandomValues(new Uint8Array(16)),
          name: label || 'admh-user',
          displayName: label || 'ADMH User'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000
      }
    })) as PublicKeyCredential | null;
    if (!credential) return null;
    return bufferToBase64Url(credential.rawId);
  } catch {
    return null;
  }
}

/**
 * Verify biometric unlock.
 * Native ignores the credential id and asks the OS BiometricPrompt; the web
 * keeps using the stored WebAuthn credential. The native sentinel is never sent
 * to WebAuthn.
 */
export async function verifyBiometric(credentialId: string): Promise<boolean> {
  if (isNativePlatform()) return verifyNativeBiometric();
  if (credentialId === NATIVE_BIOMETRIC_SENTINEL) return false;
  try {
    if (!(await biometricAvailable())) return false;
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomChallenge(),
        allowCredentials: [{ id: base64UrlToBuffer(credentialId), type: 'public-key' }],
        userVerification: 'required',
        timeout: 60000
      }
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}
