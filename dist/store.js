"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetDb = resetDb;
exports.isEqualBytes = isEqualBytes;
exports.newJsSessionStore = newJsSessionStore;
exports.newJsIdentityStore = newJsIdentityStore;
exports.newJsPreKeyStore = newJsPreKeyStore;
exports.newJsSignedPreKeyStore = newJsSignedPreKeyStore;
exports.newJsKyberPreKeyStore = newJsKyberPreKeyStore;
const idb_1 = require("idb");
const libsignal = __importStar(require("libsignal-protocol"));
let db = undefined;
const sessionsStoreName = "sessions";
const identitesStoreName = "identities";
const preKeysStoreName = "pre_keys";
const signedPreKeysStoreName = "signed_pre_keys";
const senderKeysStoreName = "sender_keys";
const kyberPreKeysStoreName = "kyber_pre_keys";
const getDb = async () => {
    if (!db) {
        db = await (0, idb_1.openDB)("firefly-signal", 1, {
            upgrade(db) {
                const storeNames = [
                    sessionsStoreName,
                    identitesStoreName,
                    preKeysStoreName,
                    signedPreKeysStoreName,
                    senderKeysStoreName,
                    kyberPreKeysStoreName
                ];
                for (const storeName of storeNames) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName);
                    }
                }
            },
        });
    }
    return db;
};
async function resetDb() {
    const db = await getDb();
    for (const storeName of db.objectStoreNames) {
        await db.clear(storeName);
    }
}
function getStore(name) {
    const storeName = name;
    return {
        async get(key) {
            const db = await getDb();
            return db.get(storeName, key);
        },
        async set(key, value) {
            const db = await getDb();
            return db.put(storeName, value, key);
        },
        async remove(key) {
            const db = await getDb();
            return db.delete(storeName, key);
        },
        async getAll() {
            const db = await getDb();
            return db.getAll(storeName);
        },
        async transaction() {
            const db = await getDb();
            return db.transaction(storeName, "readwrite");
        }
    };
}
function isEqualBytes(bytes1, bytes2) {
    if (typeof window !== "undefined") {
        return window.indexedDB.cmp(bytes1, bytes2) == 0;
    }
    if (bytes1.length !== bytes2.length) {
        return false;
    }
    for (let i = 0; i < bytes1.length; i++) {
        if (bytes1[i] !== bytes2[i]) {
            return false;
        }
    }
    return true;
}
function newJsSessionStore() {
    return new libsignal.JsSessionStore((addr) => getStore(sessionsStoreName).get(addr), (addr, value) => getStore(sessionsStoreName).set(addr, value));
}
function newJsIdentityStore() {
    return new libsignal.JsIdentityKeyStore(async (addr, identity, _direction) => {
        const value = await getStore(identitesStoreName).get(addr);
        if (value) {
            return isEqualBytes(value, identity);
        }
        else {
            return true;
        }
    }, async () => {
        let key = await getStore(identitesStoreName).get("identityKey");
        if (!key) {
            const newKey = libsignal.PrivateKey.generate();
            console.log(`New Identity Key generated`);
            key = newKey.serialize();
            newKey.free();
            await getStore(identitesStoreName).set("identityKey", key);
        }
        return key;
    }, async () => (await getStore(identitesStoreName).get("registrationId")) ?? 1, async (addr, identity) => {
        const oldValue = await getStore(identitesStoreName).get(addr);
        await getStore(identitesStoreName).set(addr, identity);
        if (oldValue) {
            return isEqualBytes(oldValue, identity);
        }
        else {
            return true;
        }
    }, (addr) => getStore(identitesStoreName).get(addr));
}
function newJsPreKeyStore() {
    return new libsignal.JsPreKeyStore((addr) => getStore(preKeysStoreName).get(addr), (addr, record) => getStore(preKeysStoreName).set(addr, record), (addr) => getStore(preKeysStoreName).remove(addr));
}
function newJsSignedPreKeyStore() {
    return new libsignal.JsSignedPreKeyStore((addr) => getStore(signedPreKeysStoreName).get(addr), (addr, record) => getStore(signedPreKeysStoreName).set(addr, record));
}
function newJsKyberPreKeyStore() {
    return new libsignal.JsKyberPreKeyStore(async (addr) => {
        const value = await getStore(kyberPreKeysStoreName).get(addr);
        if (value && "record" in value) {
            return value.record;
        }
    }, (addr, record) => getStore(kyberPreKeysStoreName).set(addr, { record }), async (addr, preKeyId, publicKey) => {
        const store = getStore(kyberPreKeysStoreName);
        const tx = await store.transaction();
        const value = await tx.store.get(addr);
        if (value) {
            value["used"] = true;
            value["pre_key"] = preKeyId;
            value["public_key"] = publicKey;
            await tx.store.put(value, addr);
        }
        await tx.done;
    });
}
