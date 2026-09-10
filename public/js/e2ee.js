/**
 * Client-Side End-to-End Encryption (E2EE) Module
 * Uses Web Crypto API: ECDH (P-256) for key agreement + AES-GCM (256-bit) for encryption
 * Persists private keys safely in browser IndexedDB
 */

const E2EE = (function() {
    'use strict';

    const DB_NAME = 'ChatApp_E2EE_Keys';
    const STORE_NAME = 'keypairs';
    let currentUserId = null;
    let myKeyPair = null;
    let myPublicKeyJWK = null;

    const peerKeyCache = new Map();
    const sharedKeyCache = new Map();

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            request.onupgradeneeded = function(e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
                }
            };
            request.onsuccess = function(e) {
                resolve(e.target.result);
            };
            request.onerror = function(e) {
                reject(e.target.error);
            };
        });
    }

    async function getStoredKeyPair(userId) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(userId);
            req.onsuccess = function() {
                resolve(req.result);
            };
            req.onerror = function(e) {
                reject(e.target.error);
            };
        });
    }

    async function storeKeyPair(userId, privateKey, publicKey, jwk) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put({ userId, privateKey, publicKey, jwk });
            req.onsuccess = function() {
                resolve();
            };
            req.onerror = function(e) {
                reject(e.target.error);
            };
        });
    }

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    function base64ToArrayBuffer(base64) {
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Initialize E2EE for the logged in user:
     * - Load or generate ECDH P-256 keypair
     * - Sync public key to backend
     */
    async function init(userId) {
        currentUserId = userId;
        try {
            let record = await getStoredKeyPair(userId);
            if (record && record.privateKey && record.publicKey && record.jwk) {
                myKeyPair = {
                    privateKey: record.privateKey,
                    publicKey: record.publicKey
                };
                myPublicKeyJWK = record.jwk;
            } else {
                // Generate new key pair
                myKeyPair = await window.crypto.subtle.generateKey(
                    { name: 'ECDH', namedCurve: 'P-256' },
                    true,
                    ['deriveKey', 'deriveBits']
                );
                myPublicKeyJWK = await window.crypto.subtle.exportKey('jwk', myKeyPair.publicKey);
                await storeKeyPair(userId, myKeyPair.privateKey, myKeyPair.publicKey, myPublicKeyJWK);
            }

            // Sync public key to the server
            await syncPublicKeyToServer(myPublicKeyJWK);
            console.log('[E2EE] Initialized successfully for user:', userId);
            return true;
        } catch (err) {
            console.error('[E2EE] Initialization error:', err);
            return false;
        }
    }

    async function syncPublicKeyToServer(jwk) {
        try {
            const res = await fetch('/save-public-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ publicKey: jwk })
            });
            const data = await res.json();
            return data.success;
        } catch (err) {
            console.error('[E2EE] Failed to sync public key to server:', err);
            return false;
        }
    }

    async function getPeerPublicKey(peerId) {
        if (peerKeyCache.has(peerId)) {
            return peerKeyCache.get(peerId);
        }
        try {
            const res = await fetch('/get-public-key/' + peerId);
            const data = await res.json();
            if (data.success && data.publicKey) {
                const importedKey = await window.crypto.subtle.importKey(
                    'jwk',
                    data.publicKey,
                    { name: 'ECDH', namedCurve: 'P-256' },
                    true,
                    []
                );
                peerKeyCache.set(peerId, importedKey);
                return importedKey;
            }
            return null;
        } catch (err) {
            console.error('[E2EE] Failed to get peer public key:', err);
            return null;
        }
    }

    async function getSharedKey(peerId) {
        if (sharedKeyCache.has(peerId)) {
            return sharedKeyCache.get(peerId);
        }

        if (!myKeyPair || !myKeyPair.privateKey) {
            throw new Error('E2EE is not initialized');
        }

        const peerPublicKey = await getPeerPublicKey(peerId);
        if (!peerPublicKey) {
            return null;
        }

        const sharedKey = await window.crypto.subtle.deriveKey(
            { name: 'ECDH', public: peerPublicKey },
            myKeyPair.privateKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );

        sharedKeyCache.set(peerId, sharedKey);
        return sharedKey;
    }

    /**
     * Encrypt message for a specific peer
     */
    async function encryptMessage(plainText, peerId) {
        const sharedKey = await getSharedKey(peerId);
        if (!sharedKey) {
            // Recipient has not registered an E2EE public key yet
            return null;
        }

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(plainText);

        const ciphertextBuffer = await window.crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            sharedKey,
            encoded
        );

        return {
            ciphertext: arrayBufferToBase64(ciphertextBuffer),
            iv: arrayBufferToBase64(iv)
        };
    }

    /**
     * Decrypt message received from or sent to a specific peer
     */
    async function decryptMessage(ciphertextBase64, ivBase64, peerId) {
        if (!ciphertextBase64) return '';

        // If no IV was stored, this is an unencrypted legacy message
        if (!ivBase64) {
            return ciphertextBase64;
        }

        try {
            const sharedKey = await getSharedKey(peerId);
            if (!sharedKey) {
                return '[Encrypted message - recipient key missing]';
            }

            const ciphertext = base64ToArrayBuffer(ciphertextBase64);
            const iv = base64ToArrayBuffer(ivBase64);

            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                sharedKey,
                ciphertext
            );

            return new TextDecoder().decode(decryptedBuffer);
        } catch (err) {
            console.error('[E2EE] Decryption error:', err);
            return '[Encrypted message - could not decrypt]';
        }
    }

    return {
        init,
        encryptMessage,
        decryptMessage,
        getPeerPublicKey
    };
})();
