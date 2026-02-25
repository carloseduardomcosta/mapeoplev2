'use client';

/**
 * E2E Encryption using ECDH key exchange + AES-GCM.
 *
 * Flow:
 * 1. Each user generates an ECDH key pair on first use (stored in IndexedDB)
 * 2. Public key is uploaded to the server
 * 3. To encrypt a message, derive a shared secret from (my private key + peer's public key)
 * 4. Use the shared secret to encrypt/decrypt with AES-GCM
 *
 * Fallback: If peer has no public key, uses a deterministic key derivation (PBKDF2)
 * so messages can still be sent. These will be re-encrypted once both users have keys.
 */

import { fetchWithAuth } from './fetchWithAuth';

const DB_NAME = 'mapeople-e2e';
const DB_VERSION = 1;
const STORE_NAME = 'keys';
const KEY_ID = 'my-ecdh-keypair';

// ─── IndexedDB helpers ──────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getFromDB(key: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function putToDB(value: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Key pair management ────────────────────────────────────────────────────

export async function getOrCreateKeyPair(): Promise<CryptoKeyPair> {
  const stored = await getFromDB(KEY_ID);

  if (stored?.privateKey && stored?.publicKey) {
    try {
      const privateKey = await crypto.subtle.importKey(
        'jwk', stored.privateKey,
        { name: 'ECDH', namedCurve: 'P-256' },
        true, ['deriveKey'],
      );
      const publicKey = await crypto.subtle.importKey(
        'jwk', stored.publicKey,
        { name: 'ECDH', namedCurve: 'P-256' },
        true, [],
      );
      console.log('[E2E] Loaded existing key pair from IndexedDB');
      return { privateKey, publicKey };
    } catch (err) {
      console.warn('[E2E] Failed to load stored keys, generating new pair:', err);
    }
  }

  // Generate new key pair
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey'],
  );

  // Export and store in IndexedDB
  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

  await putToDB({ id: KEY_ID, privateKey: privateJwk, publicKey: publicJwk });
  console.log('[E2E] Generated and stored new ECDH key pair');

  return keyPair;
}

export async function getPublicKeyJwk(): Promise<JsonWebKey> {
  const keyPair = await getOrCreateKeyPair();
  return crypto.subtle.exportKey('jwk', keyPair.publicKey);
}

// ─── Upload public key to server ────────────────────────────────────────────

export async function uploadPublicKey(): Promise<void> {
  const publicJwk = await getPublicKeyJwk();
  const publicKeyStr = JSON.stringify(publicJwk);

  try {
    const res = await fetchWithAuth('/api/auth/public-key', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publicKey: publicKeyStr }),
    });
    if (res.ok) {
      console.log('[E2E] Public key uploaded to server');
    } else {
      console.error('[E2E] Failed to upload public key:', res.status);
    }
  } catch (err) {
    console.error('[E2E] Error uploading public key:', err);
  }
}

// ─── Fetch peer's public key ────────────────────────────────────────────────

const peerKeyCache = new Map<string, CryptoKey>();

async function getPeerPublicKey(peerId: string): Promise<CryptoKey | null> {
  if (peerKeyCache.has(peerId)) {
    return peerKeyCache.get(peerId)!;
  }

  try {
    const res = await fetchWithAuth(`/api/auth/public-key/${peerId}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.publicKey) return null;

    const jwk = JSON.parse(data.publicKey);
    const key = await crypto.subtle.importKey(
      'jwk', jwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false, [],
    );
    peerKeyCache.set(peerId, key);
    return key;
  } catch (err) {
    console.error('[E2E] Failed to fetch peer public key:', err);
    return null;
  }
}

// ─── Derive shared AES key ─────────────────────────────────────────────────

async function deriveSharedKey(peerPublicKey: CryptoKey): Promise<CryptoKey> {
  const keyPair = await getOrCreateKeyPair();
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    keyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ─── Fallback: deterministic key (for peers without public key) ─────────────

function sortedPairKey(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join(':');
}

async function deriveFallbackKey(userId1: string, userId2: string): Promise<CryptoKey> {
  const pairKey = sortedPairKey(userId1, userId2);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode('mapeople-v2-e2e-fallback:' + pairKey),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('mapeople-salt-' + pairKey),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ─── Encrypt / Decrypt ──────────────────────────────────────────────────────

export async function encryptMessage(
  plaintext: string,
  senderId: string,
  receiverId: string,
): Promise<{ encryptedContent: string; iv: string }> {
  const peerKey = await getPeerPublicKey(receiverId);
  let aesKey: CryptoKey;

  if (peerKey) {
    aesKey = await deriveSharedKey(peerKey);
    console.log('[E2E] Encrypting with ECDH shared key');
  } else {
    aesKey = await deriveFallbackKey(senderId, receiverId);
    console.log('[E2E] Encrypting with fallback PBKDF2 key (peer has no public key)');
  }

  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encoder.encode(plaintext),
  );

  return {
    encryptedContent: bufferToBase64(encrypted),
    iv: bufferToBase64(iv.buffer),
  };
}

export async function decryptMessage(
  encryptedContent: string,
  iv: string,
  senderId: string,
  receiverId: string,
): Promise<string> {
  // Try ECDH first, then fallback
  const peerId = senderId; // The peer is the sender (we are the receiver)
  const peerKey = await getPeerPublicKey(peerId);

  const keysToTry: CryptoKey[] = [];

  if (peerKey) {
    keysToTry.push(await deriveSharedKey(peerKey));
  }
  keysToTry.push(await deriveFallbackKey(senderId, receiverId));

  for (const aesKey of keysToTry) {
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: base64ToBuffer(iv) },
        aesKey,
        base64ToBuffer(encryptedContent),
      );
      return new TextDecoder().decode(decrypted);
    } catch {
      // Try next key
    }
  }

  console.error('[E2E] Failed to decrypt message with any available key');
  return '[Mensagem não pôde ser descriptografada]';
}

// ─── Buffer utilities ───────────────────────────────────────────────────────

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
