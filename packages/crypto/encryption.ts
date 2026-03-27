import { importCryptoKey } from './keys';

export interface CryptoOutput {
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

export async function encryptPayload(key: Uint8Array, data: string): Promise<CryptoOutput> {
  const cryptoKey = await importCryptoKey(key);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const encoder = new TextEncoder();
  const encoded = encoder.encode(data);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    cryptoKey,
    encoded
  );

  return {
    iv,
    ciphertext: new Uint8Array(ciphertextBuffer)
  };
}

export async function decryptPayload(key: Uint8Array, data: CryptoOutput): Promise<string> {
  const cryptoKey = await importCryptoKey(key);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(data.iv)
    },
    cryptoKey,
    new Uint8Array(data.ciphertext)
  ) as ArrayBuffer;

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
