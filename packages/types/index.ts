export interface Item {
  id: string; // uuid
  url: string;
  title: string | null;
  note: string | null;
  mode: "hidden" | "visible";
}

export interface EncryptedPayload {
  version: number;
  name: string | null;
  items: Item[];
  created_at: number;
}

export interface ServerRecord {
  id: string;
  blob_key: string;
  expires_at: number | null;
  max_views: number | null;
  views: number;
}

export interface CryptoOutput {
  iv: Uint8Array;
  ciphertext: Uint8Array;
}
