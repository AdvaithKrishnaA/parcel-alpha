import { argon2id } from 'hash-wasm';
import { encodeBase64Url, decodeBase64Url } from './encoding';

// Generate random folder key
export function generateFolderKey(): Uint8Array {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return key;
}

export function exportKey(key: Uint8Array): string {
  return encodeBase64Url(key);
}

export function importKey(keyStr: string): Uint8Array {
  return decodeBase64Url(keyStr);
}

// Derive a sync key from password
export async function deriveMasterKey(password: string): Promise<Uint8Array> {
  // Using a static salt since we only care about user sync blob.
  // In a real system, you might generate a salt per user, but here user_id IS the hash of this key.
  const salt = new Uint8Array(16); // fixed zero salt for derivation stability, or we can use a hardcoded salt string.

  // To avoid storing salts per user on the server (server is dumb), we use a fixed app salt.
  const fixedSalt = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

  const hashHex = await argon2id({
    password: password,
    salt: fixedSalt,
    parallelism: 1,
    iterations: 3,
    memorySize: 64 * 1024, // 64 MB
    hashLength: 32,
    outputType: 'hex'
  });

  // Convert hex to Uint8Array
  const key = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    key[i] = parseInt(hashHex.slice(i * 2, i * 2 + 2), 16);
  }
  return key;
}

// Generate user_id from master key (SHA-256)
export async function getUserId(masterKey: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', masterKey as any);
  const hashArray = new Uint8Array(hashBuffer);
  // Convert to hex for user_id
  const hashHex = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

// AES-GCM Key import for Web Crypto
export async function importCryptoKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    rawKey as any,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}
