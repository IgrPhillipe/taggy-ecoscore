import { createJSONStorage } from "zustand/middleware";
import type { StateStorage, PersistStorage } from "zustand/middleware";

const SECRET = import.meta.env.VITE_STORAGE_SECRET as string | undefined;

let cachedKey: CryptoKey | null = null;

async function deriveKey(secret: string): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  cachedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("taggy-ecoscore-salt"),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );

  return cachedKey;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!SECRET) return plaintext;

  const key = await deriveKey(SECRET);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext),
  );

  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return toBase64(combined.buffer);
}

export async function decrypt(ciphertext: string): Promise<string> {
  if (!SECRET) return ciphertext;

  try {
    const key = await deriveKey(SECRET);
    const combined = fromBase64(ciphertext);
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data,
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    // Dados podem estar em plaintext de uma sessão anterior sem criptografia
    return ciphertext;
  }
}

function makeRawStorage(): StateStorage {
  return {
    getItem: async (name: string): Promise<string | null> => {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      return decrypt(raw);
    },
    setItem: async (name: string, value: string): Promise<void> => {
      const encoded = await encrypt(value);
      localStorage.setItem(name, encoded);
    },
    removeItem: (name: string): void => {
      localStorage.removeItem(name);
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createEncryptedStorage<S = unknown>(): PersistStorage<S> {
  if (!SECRET) {
    console.warn(
      "[encrypted-storage] VITE_STORAGE_SECRET not set — storing without encryption.",
    );
  }

  const storage = makeRawStorage();
  return createJSONStorage<S>(() => storage) as PersistStorage<S>;
}
