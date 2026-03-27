import { encryptPayload, decryptPayload, getUserId, CryptoOutput } from '@app/crypto';

export interface SyncState {
  version: number;
  bundles: Record<string, any>; // Adjust this typing as needed based on how the app uses it
  updated_at: number;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert CryptoOutput to something that can be JSON stringified/sent over HTTP
export function serializeCryptoOutput(co: CryptoOutput): string {
  // We convert Uint8Array to Base64 avoiding max call stack size
  const ivBase64 = uint8ArrayToBase64(co.iv);
  const ciphertextBase64 = uint8ArrayToBase64(co.ciphertext);
  return JSON.stringify({
    iv: ivBase64,
    ciphertext: ciphertextBase64
  });
}

export function deserializeCryptoOutput(str: string): CryptoOutput {
  const parsed = JSON.parse(str);

  const ivStr = atob(parsed.iv);
  const iv = new Uint8Array(ivStr.length);
  for (let i = 0; i < ivStr.length; i++) iv[i] = ivStr.charCodeAt(i);

  const ctStr = atob(parsed.ciphertext);
  const ciphertext = new Uint8Array(ctStr.length);
  for (let i = 0; i < ctStr.length; i++) ciphertext[i] = ctStr.charCodeAt(i);

  return { iv, ciphertext };
}

export class SyncClient {
  private apiUrl: string;
  private masterKey: Uint8Array | null = null;
  private userId: string | null = null;
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl.replace(/\/$/, "");
  }

  public async setMasterKey(key: Uint8Array) {
    this.masterKey = key;
    this.userId = await getUserId(key);
  }

  public getUserId(): string | null {
    return this.userId;
  }

  public async load(): Promise<SyncState | null> {
    if (!this.masterKey || !this.userId) {
      throw new Error("Master key not set");
    }

    try {
      const response = await fetch(`${this.apiUrl}/sync/${this.userId}`);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to load sync state: ${response.statusText}`);
      }

      const bodyStr = await response.text();
      const cryptoOutput = deserializeCryptoOutput(bodyStr);

      const decryptedStr = await decryptPayload(this.masterKey, cryptoOutput);
      return JSON.parse(decryptedStr) as SyncState;

    } catch (e) {
      console.error("Sync load error:", e);
      return null;
    }
  }

  public async save(state: SyncState): Promise<void> {
    if (!this.masterKey || !this.userId) {
      throw new Error("Master key not set");
    }

    const stateStr = JSON.stringify(state);
    const encrypted = await encryptPayload(this.masterKey, stateStr);
    const serialized = serializeCryptoOutput(encrypted);

    const response = await fetch(`${this.apiUrl}/sync`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user_id: this.userId,
        payload: serialized
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to save sync state: ${response.statusText}`);
    }
  }

  // Debounced save (1.5s)
  public debouncedSave(state: SyncState, onComplete?: () => void, onError?: (e: any) => void) {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(async () => {
      try {
        await this.save(state);
        if (onComplete) onComplete();
      } catch (e) {
        if (onError) onError(e);
      }
    }, 1500);
  }
}
