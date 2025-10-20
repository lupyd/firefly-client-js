import * as libsignal from "@signalapp/libsignal-client";
import { openDB } from "idb";

function makeStore(name: string) {
  const dbName = "firefly";
  const storeName = name;

  return {
    async get(key: string | number) {
      const db = await openDB(dbName, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        },
      });
      return db.get(storeName, key);
    },
    async set(key: string | number, value: any) {
      const db = await openDB(dbName, 1);
      return db.put(storeName, value, key);
    },
    async remove(key: string | number) {
      const db = await openDB(dbName, 1);
      return db.delete(storeName, key);
    },
    async getAll() {
      const db = await openDB(dbName, 1);
      return db.getAll(storeName);
    },
  };
}

export class IndexedDbSessionStore extends libsignal.SessionStore {
  async saveSession(
    name: libsignal.ProtocolAddress,
    record: libsignal.SessionRecord,
  ): Promise<void> {
    await this.store.set(name.toString(), record.serialize());
  }
  async getSession(
    name: libsignal.ProtocolAddress,
  ): Promise<libsignal.SessionRecord | null> {
    const session = await this.store.get(name.toString());
    if (session) {
      return libsignal.SessionRecord.deserialize(session);
    } else {
      return null;
    }
  }
  async getExistingSessions(
    addresses: libsignal.ProtocolAddress[],
  ): Promise<libsignal.SessionRecord[]> {
    const sessions: libsignal.SessionRecord[] = [];
    for (const address of addresses) {
      const session = await this.store.get(address.toString());
      if (session) {
        sessions.push(libsignal.SessionRecord.deserialize(session));
      }
    }
    return sessions;
  }
  store = makeStore("sessions");

  async deleteSession(address: libsignal.ProtocolAddress) {
    await this.store.remove(address.toString());
  }

  async getSubDeviceSessions(name: string) {
    const all = await this.store.getAll();
    return Object.keys(all).filter((k) => k.startsWith(`${name}.`));
  }
}

export class IndexedDbIdentityKeyStore extends libsignal.IdentityKeyStore {
  store = makeStore("identites");

  async saveIdentity(
    name: libsignal.ProtocolAddress,
    key: libsignal.PublicKey,
  ): Promise<libsignal.IdentityChange> {
    const oldKey = await this.store.get(name.toString());
    if (!oldKey) {
      await this.store.set(name.toString(), key.serialize());
      return libsignal.IdentityChange.NewOrUnchanged;
    } else {
      if (window.indexedDB.cmp(oldKey, key.serialize()) == 0) {
        return libsignal.IdentityChange.NewOrUnchanged;
      } else {
        await this.store.set(name.toString(), key.serialize());
        return libsignal.IdentityChange.ReplacedExisting;
      }
    }
  }
  async isTrustedIdentity(
    name: libsignal.ProtocolAddress,
    key: libsignal.PublicKey,
    _direction: libsignal.Direction,
  ): Promise<boolean> {
    const publicKey = await this.store.get(name.toString());
    if (!publicKey) {
      return false;
    }

    return key.compare(libsignal.PublicKey.deserialize(publicKey)) == 0;
  }
  async getIdentityKey(): Promise<libsignal.PrivateKey> {
    const key = await this.store.get("identityKey");
    if (!key) {
      const newKey = libsignal.PrivateKey.generate();
      console.log(`New Identity Key generated`);
      await this.store.set("identityKey", newKey.serialize());
      return newKey;
    }

    return libsignal.PrivateKey.deserialize(key);
  }
  async getIdentity(
    name: libsignal.ProtocolAddress,
  ): Promise<libsignal.PublicKey | null> {
    const identity = await this.store.get(name.toString());
    if (!identity) {
      return null;
    }
    return libsignal.PublicKey.deserialize(identity);
  }

  async getLocalRegistrationId() {
    return this.store.get("registrationId") ?? 0;
  }
}

export class IndexedDbPreKeyStore extends libsignal.PreKeyStore {
  store = makeStore("prekeys");
  async savePreKey(id: number, record: libsignal.PreKeyRecord): Promise<void> {
    await this.store.set(id, record.serialize());
  }
  async getPreKey(id: number): Promise<libsignal.PreKeyRecord> {
    const data = await this.store.get(id);
    if (!data) {
      throw new Error("Key doesn't exist");
    }
    return libsignal.PreKeyRecord.deserialize(data);
  }

  async removePreKey(id: number) {
    await this.store.remove(id);
  }
}

export class IndexedDbSignedPreKeyStore extends libsignal.SignedPreKeyStore {
  store = makeStore("signed_prekeys");

  async saveSignedPreKey(
    id: number,
    record: libsignal.SignedPreKeyRecord,
  ): Promise<void> {
    await this.store.set(id, record.serialize());
  }
  async getSignedPreKey(id: number): Promise<libsignal.SignedPreKeyRecord> {
    const data = await this.store.get(id);
    if (!data) {
      throw new Error("Key doesn't exist");
    }
    return libsignal.SignedPreKeyRecord.deserialize(data);
  }

  async removeSignedPreKey(id: number) {
    await this.store.remove(id);
  }
}

export class IndexedDbSenderKeyStore extends libsignal.SenderKeyStore {
  store = makeStore("senderkeys");

  async saveSenderKey(
    sender: libsignal.ProtocolAddress,
    distributionId: libsignal.Uuid,
    record: libsignal.SenderKeyRecord,
  ): Promise<void> {
    await this.store.set(sender.toString(), record.serialize());
  }
  async getSenderKey(
    sender: libsignal.ProtocolAddress,
    distributionId: libsignal.Uuid,
  ): Promise<libsignal.SenderKeyRecord | null> {
    const data = await this.store.get(sender.toString());
    return data ? libsignal.SenderKeyRecord.deserialize(data) : null;
  }
}

export class IndexedDbKyberPreKeyStore extends libsignal.KyberPreKeyStore {
  store = makeStore("kyber_prekeys");
  usedStore = makeStore("used_kyber_prekeys");

  async saveKyberPreKey(
    id: number,
    record: libsignal.KyberPreKeyRecord,
  ): Promise<void> {
    await this.store.set(id, record.serialize());
  }
  async getKyberPreKey(id: number): Promise<libsignal.KyberPreKeyRecord> {
    const data = await this.store.get(id);
    if (!data) {
      throw new Error("Key doesn't exist");
    }
    return libsignal.KyberPreKeyRecord.deserialize(data);
  }
  async markKyberPreKeyUsed(id: number): Promise<void> {
    await this.usedStore.set(id, Date.now());
  }

  async storeKyberPreKey(id: number, record: libsignal.KyberPreKeyRecord) {
    await this.store.set(id, record.serialize());
  }

  async removeKyberPreKey(id: number) {
    await this.store.remove(id);
  }
}
