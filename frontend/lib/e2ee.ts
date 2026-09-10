/**
 * Client-Side End-to-End Encryption (E2EE) Module for Next.js
 * Algorithm: ECDH (NIST P-256) + AES-GCM (256-bit)
 * Storage: Browser IndexedDB
 */

const DB_NAME = 'ChatApp_E2EE_Keys';
const STORE_NAME = 'keypairs';

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string;         // base64
}

interface StoredKeyRecord {
  userId: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  jwk: JsonWebKey;
}

class E2EEService {
  private currentUserId: string | null = null;
  private myKeyPair: { privateKey: CryptoKey; publicKey: CryptoKey } | null = null;
  private myPublicKeyJWK: JsonWebKey | null = null;
  private peerKeyCache = new Map<string, CryptoKey>();
  private sharedKeyCache = new Map<string, CryptoKey>();

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported'));
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
        }
      };
      request.onsuccess = (e) => {
        resolve((e.target as IDBOpenDBRequest).result);
      };
      request.onerror = (e) => {
        reject((e.target as IDBOpenDBRequest).error);
      };
    });
  }

  private async getStoredKeyPair(userId: string): Promise<StoredKeyRecord | undefined> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(userId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async storeKeyPair(userId: string, privateKey: CryptoKey, publicKey: CryptoKey, jwk: JsonWebKey): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ userId, privateKey, publicKey, jwk });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  public async init(userId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    this.currentUserId = userId;

    try {
      const record = await this.getStoredKeyPair(userId);
      if (record?.privateKey && record?.publicKey && record?.jwk) {
        this.myKeyPair = {
          privateKey: record.privateKey,
          publicKey: record.publicKey,
        };
        this.myPublicKeyJWK = record.jwk;
      } else {
        // Generate new ECDH P-256 key pair
        const generated = await window.crypto.subtle.generateKey(
          { name: 'ECDH', namedCurve: 'P-256' },
          true,
          ['deriveKey', 'deriveBits']
        );
        this.myKeyPair = generated;
        this.myPublicKeyJWK = await window.crypto.subtle.exportKey('jwk', this.myKeyPair.publicKey);
        await this.storeKeyPair(userId, this.myKeyPair.privateKey, this.myKeyPair.publicKey, this.myPublicKeyJWK);
      }

      // Sync public key with backend
      await this.syncPublicKey(this.myPublicKeyJWK);
      return true;
    } catch (err) {
      console.error('[E2EE] Init failed:', err);
      return false;
    }
  }

  private async syncPublicKey(jwk: JsonWebKey): Promise<boolean> {
    try {
      const res = await fetch('/api/save-public-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ publicKey: jwk }),
      });
      const data = await res.json();
      return !!data.success;
    } catch (err) {
      console.error('[E2EE] Failed to sync public key to server:', err);
      return false;
    }
  }

  public async getPeerPublicKey(peerId: string): Promise<CryptoKey | null> {
    if (this.peerKeyCache.has(peerId)) {
      return this.peerKeyCache.get(peerId)!;
    }

    try {
      const res = await fetch('/api/get-public-key/' + peerId, {
        credentials: 'include',
      });
      const data = await res.json();

      if (data.success && data.publicKey) {
        const imported = await window.crypto.subtle.importKey(
          'jwk',
          data.publicKey,
          { name: 'ECDH', namedCurve: 'P-256' },
          true,
          []
        );
        this.peerKeyCache.set(peerId, imported);
        return imported;
      }
      return null;
    } catch (err) {
      console.error('[E2EE] Error fetching peer public key:', err);
      return null;
    }
  }

  public async getSharedKey(peerId: string): Promise<CryptoKey | null> {
    if (this.sharedKeyCache.has(peerId)) {
      return this.sharedKeyCache.get(peerId)!;
    }

    if (!this.myKeyPair?.privateKey) {
      if (this.currentUserId) {
        await this.init(this.currentUserId);
      }
      if (!this.myKeyPair?.privateKey) {
        console.warn('[E2EE] myKeyPair not initialized for current user');
        return null;
      }
    }

    const peerPublicKey = await this.getPeerPublicKey(peerId);
    if (!peerPublicKey) {
      return null;
    }

    try {
      const sharedKey = await window.crypto.subtle.deriveKey(
        { name: 'ECDH', public: peerPublicKey },
        this.myKeyPair.privateKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      this.sharedKeyCache.set(peerId, sharedKey);
      return sharedKey;
    } catch (err) {
      console.error('[E2EE] deriveKey error:', err);
      return null;
    }
  }

  public async encryptMessage(plainText: string, peerId: string): Promise<EncryptedPayload | null> {
    const sharedKey = await this.getSharedKey(peerId);
    if (!sharedKey) {
      return null;
    }

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);

    const ciphertextBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      encoded
    );

    return {
      ciphertext: this.arrayBufferToBase64(ciphertextBuffer),
      iv: this.arrayBufferToBase64(iv.buffer),
    };
  }

  public async decryptMessage(ciphertextBase64: string, ivBase64: string, peerId: string): Promise<string> {
    if (!ciphertextBase64) return '';

    // Legacy unencrypted message fallback
    if (!ivBase64) {
      return ciphertextBase64;
    }

    try {
      const sharedKey = await this.getSharedKey(peerId);
      if (!sharedKey) {
        return '[🔒 Encrypted message - key unavailable]';
      }

      const ciphertext = this.base64ToArrayBuffer(ciphertextBase64);
      const iv = this.base64ToArrayBuffer(ivBase64);

      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        sharedKey,
        ciphertext
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (err) {
      console.error('[E2EE] Decryption error:', err);
      return '[🔒 Encrypted message - could not decrypt]';
    }
  }
}

export const e2ee = new E2EEService();
