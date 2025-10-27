import { IDBPDatabase, openDB } from "idb";

import * as libsignal from "libsignal-protocol";
let db: IDBPDatabase | undefined = undefined;

const sessionsStoreName = "sessions";
const identitesStoreName = "identities";
const preKeysStoreName = "pre_keys";
const signedPreKeysStoreName = "signed_pre_keys";
const senderKeysStoreName = "sender_keys";
const kyberPreKeysStoreName = "kyber_pre_keys";


const getDb = async () => {
  if (!db) {
    db = await openDB("firefly-signal", 1, {
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

export async function resetDb() {
  const db = await getDb();
  for (const storeName of db.objectStoreNames) {
    await db.clear(storeName);
  }
}

function getStore(name: string) {
  const storeName = name;
  return {
    async get(key: string) {
      const db = await getDb();
      return db.get(storeName, key);
    },
    async set(key: string, value: any) {
      const db = await getDb();
      return db.put(storeName, value, key);
    },
    async remove(key: string) {
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

export function isEqualBytes(bytes1: Uint8Array, bytes2: Uint8Array): boolean {
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

export function newJsSessionStore() {
  return new libsignal.JsSessionStore(
    (addr: string) => getStore(sessionsStoreName).get(addr),
    (addr: string, value: any) => getStore(sessionsStoreName).set(addr, value),
  );
}


export function newJsIdentityStore() {
  return new libsignal.JsIdentityKeyStore(
    async (addr: string, identity: Uint8Array, _direction: libsignal.Direction) => {
      const value = await getStore(identitesStoreName).get(addr);
      if (value) {
        return isEqualBytes(value, identity);
      } else {
        return true;
      }
    },
    async () => {
      let key = await getStore(identitesStoreName).get("identityKey");
      if (!key) {
        const newKey = libsignal.PrivateKey.generate();
        console.log(`New Identity Key generated`);
        key = newKey.serialize();
        newKey.free()
        await getStore(identitesStoreName).set("identityKey", key);

      }

      return key
    },
    async () => (await getStore(identitesStoreName).get("registrationId")) ?? 1,
    async (addr: string, identity: Uint8Array) => {
      const oldValue = await getStore(identitesStoreName).get(addr);
      await getStore(identitesStoreName).set(addr, identity);
      if (oldValue) {
        return isEqualBytes(oldValue, identity);
      } else {
        return true;
      }
    },
    (addr: string) =>
      getStore(identitesStoreName).get(addr)
    ,
  );
}


export function newJsPreKeyStore() {
  return new libsignal.JsPreKeyStore(
    (addr: string) =>
      getStore(preKeysStoreName).get(addr),
    (addr: string, record: Uint8Array) =>
      getStore(preKeysStoreName).set(addr, record)
    ,
    (addr: string) =>
      getStore(preKeysStoreName).remove(addr)
    ,
  );
}

export function newJsSignedPreKeyStore() {
  return new libsignal.JsSignedPreKeyStore(
    (addr: string) => getStore(signedPreKeysStoreName).get(addr),

    (addr: string, record: Uint8Array) =>
      getStore(signedPreKeysStoreName).set(addr, record)
    ,
  );
}

export function newJsKyberPreKeyStore() {
  return new libsignal.JsKyberPreKeyStore(
    async (addr: string) => {
      const value = await getStore(kyberPreKeysStoreName).get(addr);
      if (value && "record" in value) {
        return value.record;
      }
    }
    ,
    (addr: string, record: Uint8Array) =>
      getStore(kyberPreKeysStoreName).set(addr, { record })
    ,
    async (addr: string, preKeyId: string, publicKey: Uint8Array) => {
      const store = getStore(kyberPreKeysStoreName)

      const tx = await store.transaction();

      const value = await tx.store.get(addr);
      if (value) {
        value["used"] = true;
        value["pre_key"] = preKeyId;
        value["public_key"] = publicKey;

        await tx.store.put(value, addr);
      }
      
      await tx.done;
    },
  );
}


