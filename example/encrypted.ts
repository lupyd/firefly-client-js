import * as libsignal from "@signalapp/libsignal-client";

export class InMemorySessionStore extends libsignal.SessionStore {
  private state = new Map<string, Uint8Array>();
  async saveSession(
    name: libsignal.ProtocolAddress,
    record: libsignal.SessionRecord,
  ): Promise<void> {
    const idx = name.name() + "::" + name.deviceId();
    Promise.resolve(this.state.set(idx, record.serialize()));
  }
  async getSession(
    name: libsignal.ProtocolAddress,
  ): Promise<libsignal.SessionRecord | null> {
    const idx = name.name() + "::" + name.deviceId();
    const serialized = this.state.get(idx);
    if (serialized) {
      return Promise.resolve(libsignal.SessionRecord.deserialize(serialized));
    } else {
      return Promise.resolve(null);
    }
  }
  async getExistingSessions(
    addresses: libsignal.ProtocolAddress[],
  ): Promise<libsignal.SessionRecord[]> {
    return addresses.map((address) => {
      const idx = address.name() + "::" + address.deviceId();
      const serialized = this.state.get(idx);
      if (!serialized) {
        throw "no session for " + idx;
      }
      return libsignal.SessionRecord.deserialize(serialized);
    });
  }
}

export class InMemoryIdentityKeyStore extends libsignal.IdentityKeyStore {
  private idKeys = new Map();
  private localRegistrationId: number;
  private identityKey: libsignal.PrivateKey;

  constructor(localRegistrationId?: number) {
    super();
    this.identityKey = libsignal.PrivateKey.generate();
    this.localRegistrationId = localRegistrationId ?? 5;
  }

  async getIdentityKey(): Promise<libsignal.PrivateKey> {
    return Promise.resolve(this.identityKey);
  }
  async getLocalRegistrationId(): Promise<number> {
    return Promise.resolve(this.localRegistrationId);
  }

  async isTrustedIdentity(
    name: libsignal.ProtocolAddress,
    key: libsignal.PublicKey,
    _direction: libsignal.Direction,
  ): Promise<boolean> {
    const idx = name.name() + "::" + name.deviceId();
    if (this.idKeys.has(idx)) {
      const currentKey = this.idKeys.get(idx);
      return Promise.resolve(currentKey.compare(key) == 0);
    } else {
      return Promise.resolve(true);
    }
  }
  async saveIdentity(
    name: libsignal.ProtocolAddress,
    key: libsignal.PublicKey,
  ): Promise<libsignal.IdentityChange> {
    const idx = name.name() + "::" + name.deviceId();
    const seen = this.idKeys.has(idx);
    if (seen) {
      const currentKey = this.idKeys.get(idx);
      const changed = currentKey.compare(key) != 0;
      this.idKeys.set(idx, key);
      return Promise.resolve(
        changed
          ? libsignal.IdentityChange.ReplacedExisting
          : libsignal.IdentityChange.NewOrUnchanged,
      );
    }

    this.idKeys.set(idx, key);
    return Promise.resolve(libsignal.IdentityChange.NewOrUnchanged);
  }
  async getIdentity(
    name: libsignal.ProtocolAddress,
  ): Promise<libsignal.PublicKey | null> {
    const idx = name.name() + "::" + name.deviceId();
    if (this.idKeys.has(idx)) {
      return Promise.resolve(this.idKeys.get(idx));
    } else {
      return Promise.resolve(null);
    }
  }
}

export class InMemoryPreKeyStore extends libsignal.PreKeyStore {
  private state = new Map();
  async savePreKey(id: number, record: libsignal.PreKeyRecord): Promise<void> {
    Promise.resolve(this.state.set(id, record.serialize()));
  }
  async getPreKey(id: number): Promise<libsignal.PreKeyRecord> {
    return Promise.resolve(
      libsignal.PreKeyRecord.deserialize(this.state.get(id)),
    );
  }
  async removePreKey(id: number): Promise<void> {
    this.state.delete(id);
    return Promise.resolve();
  }
}

export class InMemorySignedPreKeyStore extends libsignal.SignedPreKeyStore {
  private state = new Map();
  async saveSignedPreKey(
    id: number,
    record: libsignal.SignedPreKeyRecord,
  ): Promise<void> {
    Promise.resolve(this.state.set(id, record.serialize()));
  }
  async getSignedPreKey(id: number): Promise<libsignal.SignedPreKeyRecord> {
    return Promise.resolve(
      libsignal.SignedPreKeyRecord.deserialize(this.state.get(id)),
    );
  }
}

export class InMemorySenderKeyStore extends libsignal.SenderKeyStore {
  private state = new Map();
  async saveSenderKey(
    sender: libsignal.ProtocolAddress,
    distributionId: libsignal.Uuid,
    record: libsignal.SenderKeyRecord,
  ): Promise<void> {
    const idx =
      distributionId + "::" + sender.name() + "::" + sender.deviceId();
    Promise.resolve(this.state.set(idx, record));
  }
  async getSenderKey(
    sender: libsignal.ProtocolAddress,
    distributionId: libsignal.Uuid,
  ): Promise<libsignal.SenderKeyRecord | null> {
    const idx =
      distributionId + "::" + sender.name() + "::" + sender.deviceId();
    if (this.state.has(idx)) {
      return Promise.resolve(this.state.get(idx));
    } else {
      return Promise.resolve(null);
    }
  }
}

export class InMemoryKyberKeyStore extends libsignal.KyberPreKeyStore {
  private state = new Map();
  private usedKyberKeyIds = new Set();

  async saveKyberPreKey(
    kyberPreKeyId: number,
    record: libsignal.KyberPreKeyRecord,
  ): Promise<void> {
    this.state.set(kyberPreKeyId, record);
  }
  async getKyberPreKey(
    kyberPreKeyId: number,
  ): Promise<libsignal.KyberPreKeyRecord> {
    return this.state.get(kyberPreKeyId);
  }
  async markKyberPreKeyUsed(kyberPreKeyId: number): Promise<void> {
    this.usedKyberKeyIds.add(kyberPreKeyId);
  }
}

const randInt = () => Math.floor(Math.random() * 99999);

function uuidv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // per RFC4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );

  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20),
  ].join("-");
}

const main = async () => {
  const aKeys = new InMemoryIdentityKeyStore();
  const bKeys = new InMemoryIdentityKeyStore();

  const aSess = new InMemorySessionStore();
  const bSess = new InMemorySessionStore();

  const bPreK = new InMemoryPreKeyStore();
  const bsPreK = new InMemorySignedPreKeyStore();

  const bPreKey = libsignal.PrivateKey.generate();
  const bsPreKey = libsignal.PrivateKey.generate();

  const bIdentityKey = await bKeys.getIdentityKey();

  const bSignedPreKeySig = bIdentityKey.sign(
    bsPreKey.getPublicKey().serialize(),
  );

  const aAddress = libsignal.ProtocolAddress.new("alice", 1);
  const bAddress = libsignal.ProtocolAddress.new("bob", 2);

  const bRegistrationId = await bKeys.getLocalRegistrationId();
  const bPreKeyId = randInt();
  const bSignedPreKeyId = randInt();
  const bKEMPreKeyId = randInt();
  const bKEMPreKey = libsignal.KEMKeyPair.generate();
  const bKEMPreKeySig = bIdentityKey.sign(
    bKEMPreKey.getPublicKey().serialize(),
  );

  const bPreKeyBundle = libsignal.PreKeyBundle.new(
    bRegistrationId,
    bAddress.deviceId(),
    bPreKeyId,
    bPreKey.getPublicKey(),
    bSignedPreKeyId,
    bsPreKey.getPublicKey(),
    bSignedPreKeySig,
    bIdentityKey.getPublicKey(),
    bKEMPreKeyId,
    bKEMPreKey.getPublicKey(),
    bKEMPreKeySig,
  );

  const bPreKeyRecord = libsignal.PreKeyRecord.new(
    bPreKeyId,
    bPreKey.getPublicKey(),
    bPreKey,
  );

  bPreK.savePreKey(bPreKeyId, bPreKeyRecord);

  const bSPreKeyRecord = libsignal.SignedPreKeyRecord.new(
    bSignedPreKeyId,
    Date.now(),
    bsPreKey.getPublicKey(),
    bsPreKey,
    bSignedPreKeySig,
  );
  bsPreK.saveSignedPreKey(bSignedPreKeyId, bSPreKeyRecord);

  await libsignal.processPreKeyBundle(
    bPreKeyBundle,
    bAddress,
    aSess,
    aKeys,
    libsignal.UsePQRatchet.Yes,
    new Date(),
  );
  console.log(`processed pre key bundle`);

  const aMessage = new TextEncoder().encode("Hello World");

  const aCipherText = await libsignal.signalEncrypt(
    aMessage,
    bAddress,
    aSess,
    aKeys,
  );

  console.log({ aCipherTextTy: aCipherText.type() });

  const aCiphertextR = libsignal.PreKeySignalMessage.deserialize(
    aCipherText.serialize(),
  );

  const bKyberStore = new InMemoryKyberKeyStore();
  bKyberStore.saveKyberPreKey(
    bKEMPreKeyId,
    libsignal.KyberPreKeyRecord.new(
      bKEMPreKeyId,
      Date.now(),
      bKEMPreKey,
      bKEMPreKeySig,
    ),
  );

  const bDPlaintext = await libsignal.signalDecryptPreKey(
    aCiphertextR,
    aAddress,
    bSess,
    bKeys,
    bPreK,
    bsPreK,
    bKyberStore,
    libsignal.UsePQRatchet.Yes,
  );

  // libsignal.signalDecrypt(aCiphertext, aAddress, bSess, bKeys)

  console.log({ msg: new TextDecoder().decode(bDPlaintext) });
  const bMessage = new TextEncoder().encode("Shun the world");

  const bCiphertext = await libsignal.signalEncrypt(
    bMessage,
    aAddress,
    bSess,
    bKeys,
  );

  console.log({ bCiphertextTy: bCiphertext.type() });

  const bCiphertextR = libsignal.SignalMessage.deserialize(
    bCiphertext.serialize(),
  );

  const aDPlaintext = await libsignal.signalDecrypt(
    bCiphertextR,
    bAddress,
    aSess,
    aKeys,
  );

  console.log({ msg: new TextDecoder().decode(aDPlaintext) });

  const distributionId = uuidv4();

  const aSenderKeyStore = new InMemorySenderKeyStore();

  const senderDistributionMessage =
    await libsignal.SenderKeyDistributionMessage.create(
      aAddress,
      distributionId,
      aSenderKeyStore,
    );

  const bSenderKeyStore = new InMemorySenderKeyStore();

  await libsignal.processSenderKeyDistributionMessage(
    aAddress,
    senderDistributionMessage,
    bSenderKeyStore,
  );

  const aGroupCipher = await libsignal.groupEncrypt(
    aAddress,
    distributionId,
    aSenderKeyStore,
    aMessage,
  );
  console.log({ ty: aGroupCipher.type() });

  const result = await libsignal.groupDecrypt(
    aAddress,
    bSenderKeyStore,
    aGroupCipher.serialize(),
  );
  console.log(new TextDecoder().decode(result));
};

// main();
