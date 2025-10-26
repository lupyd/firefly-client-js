import { FireflyService } from "../src/service";
import { FireflyWsClient, protos } from "../src/index";


// import * as libsignal from "@signalapp/libsignal-client";
import * as libsignal from "libsignal-protocol";

import { crockfordEncode, ULID } from "ulid";

const baseUrl = "http://localhost:39205";

await libsignal.default();
function isEqualBytes(bytes1: Uint8Array, bytes2: Uint8Array): boolean {
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

const randInt = () => Math.floor(Math.random() * 99999);
const getAuthTokenByName = (name: string) => () => Promise.resolve(name);

// const inMemIdentityStore = new InMemoryIdentityKeyStore();
// const inMemPreKeys = new InMemoryPreKeyStore();
// const inMemSignedPreKeys = new InMemorySignedPreKeyStore();
// const inMemKyberPreKeys = new InMemoryKyberKeyStore();
// const inMemSessionStore = new InMemorySessionStore();

const sessionsMap = new Map<string, Uint8Array>();
const mySessionStore = new libsignal.JsSessionStore(
  async (addr: string) => {
    return sessionsMap.get(addr);
  },
  async (addr: string, record: Uint8Array) => {
    sessionsMap.set(addr, record);
  },
);

const identityMap = new Map<string, Uint8Array>();

const getIdentity = () => {
  const key = "identityKeyPair";
  let pair = identityMap.get(key);
  if (!pair) {
    const keyPair = libsignal.IdentityKeyPairWrapper.generate();

    pair = keyPair.serialize();
    identityMap.set(key, pair);
    keyPair.free();
  }
  return pair;
};

const getRegistrationId = () => 1;

const myIdentityStore = new libsignal.JsIdentityKeyStore(
  async (
    addr: string,
    identity: Uint8Array,
    direction: libsignal.Direction,
  ) => {
    const value = identityMap.get(addr);
    console.log({ addr, identity, value });
    if (value) {
      return isEqualBytes(value, identity);
    } else {
      return true;
    }
  },
  async () => {
    return getIdentity();
  },
  async () => {
    return getRegistrationId();
  },
  async (addr: string, identity: Uint8Array) => {
    const oldValue = identityMap.get(addr);
    identityMap.set(addr, identity);
    if (oldValue) {
      return isEqualBytes(oldValue, identity);
    } else {
      return true;
    }
  },
  async (addr: string) => {
    return identityMap.get(addr);
  },
);

const signedPreKeyMap = new Map<string, Uint8Array>();

const mySignedPreKeys = new libsignal.JsSignedPreKeyStore(
  async (addr: string) => {
    return signedPreKeyMap.get(addr);
  },
  async (addr: string, record: Uint8Array) => {
    signedPreKeyMap.set(addr, record);
  },
);

const kyberPreKeyMap = new Map<
  string,
  { publicKey: Uint8Array; used: boolean }
>();
const myKyberPreKeys = new libsignal.JsKyberPreKeyStore(
  async (addr: string) => {
    return kyberPreKeyMap.get(addr)?.publicKey;
  },
  async (addr: string, record: Uint8Array) => {
    kyberPreKeyMap.set(addr, { publicKey: record, used: false });
  },
  async (addr: string, preKeyId: string, publicKey: Uint8Array) => {
    const value = kyberPreKeyMap.get(addr);
    if (value) {
      value.used = true;
    }
  },
);

const preKeyMap = new Map<string, Uint8Array>();
const myPreKeys = new libsignal.JsPreKeyStore(
  async (addr: string) => {
    return preKeyMap.get(addr);
  },
  async (addr: string, record: Uint8Array) => {
    preKeyMap.set(addr, record);
  },
  async (addr: string) => {
    preKeyMap.delete(addr);
  },
);

async function main(svc: FireflyService, me: string, other: string) {
  let conversationId = await getConversation(svc, other);

  // const msg = `Hi, I'm ${me}, Are you ${other}? Timestamp: ${new Date()}`;

  const bobAddress = new libsignal.ProtocolAddress(other, 1);
  return async (txt: string) => {
    const cipherText = await libsignal.signalEncrypt(
      utf8Encode(txt),
      bobAddress,
      mySessionStore,
      myIdentityStore,
      BigInt(Date.now()),
    );

    let id: ULID = "";

    try {
      id = ulidFromBytes(
        await svc.postUserMessage(
          conversationId,
          cipherText.serialize(),
          cipherText.type(),
        ),
      );
    } catch (err) {
      console.error(`${err}, retrying with new conversation`);
      conversationId = await getConversation(svc, other);

      const cipherText = await libsignal.signalEncrypt(
        utf8Encode(txt),
        bobAddress,
        mySessionStore,
        myIdentityStore,
        BigInt(Date.now()),
      );

      id = ulidFromBytes(
        await svc.postUserMessage(
          conversationId,
          cipherText.serialize(),
          cipherText.type(),
        ),
      );
    }

    console.log({
      sentBy: me,
      txt,
      id,
    });
  };
}

function utf8Encode(s: string) {
  return new TextEncoder().encode(s);
}
function utf8Decode(s: Uint8Array) {
  return new TextDecoder().decode(s);
}

function ulidFromBytes(bytes: Uint8Array): ULID {
  return crockfordEncode(bytes);
}

async function uploadBundles(svc: FireflyService, username: string) {
  const myAddress = new libsignal.ProtocolAddress(username, 1);
  const identityKey =
    libsignal.IdentityKeyPairWrapper.deserialize(getIdentity());

  const bundles = protos.PreKeyBundles.create();

  for (let i = 0; i < 8; i++) {
    const registrationId = getRegistrationId();

    const preKeyId = randInt();
    const signedPreKeyId = randInt();
    const KEMPreKeyId = randInt();
    const KEMPreKey = libsignal.KEMKeyPair.generate();
    const KEMPreKeySignature = identityKey.sign(
      KEMPreKey.getPublicKey().serialize(),
    );

    const preKey = libsignal.PrivateKey.generate();
    const sPreKey = libsignal.PrivateKey.generate();

    const signedPreKeySignature = identityKey.sign(
      sPreKey.getPublicKey().serialize(),
    );

    const deviceId = myAddress.deviceId();
    const prePublicKey = preKey.getPublicKey().serialize();
    const signedPrePublicKey = sPreKey.getPublicKey().serialize();
    const identityPublicKey = identityKey.getPublicKey().serialize();

    const KEMPrePublicKey = KEMPreKey.getPublicKey().serialize();

    const bundle = protos.PreKeyBundle.create({
      registrationId,
      preKeyId,
      deviceId,
      prePublicKey,
      signedPreKeyId,
      signedPrePublicKey,
      signedPreKeySignature,
      identityPublicKey,
      KEMPreKeyId,
      KEMPrePublicKey,
      KEMPreKeySignature,
    });

    bundles.bundles.push(bundle);

    {
      const record = new libsignal.PreKeyRecord(
        preKeyId,
        preKey.getPublicKey(),
        preKey,
      );
      preKeyMap.set(preKeyId.toString(), record.serialize());
      record.free();
    }

    {
      const record = new libsignal.SignedPreKeyRecord(
        signedPreKeyId,
        BigInt(Date.now()),
        sPreKey.getPublicKey(),
        sPreKey,
        signedPreKeySignature,
      );
      signedPreKeyMap.set(signedPreKeyId.toString(), record.serialize());

      record.free();
    }
    {
      const record = new libsignal.KyberPreKeyRecord(
        KEMPreKeyId,
        BigInt(Date.now()),
        KEMPreKey,
        KEMPreKeySignature,
      );
      kyberPreKeyMap.set(KEMPreKeyId.toString(), {
        publicKey: record.serialize(),
        used: false,
      });
      record.free();
    }
  }

  await svc.uploadPreKeyBundles(bundles);
}

async function getConversation(svc: FireflyService, other: string) {
  {
    const conversations = await svc.getConversations();
    console.log(`Got conversations ${conversations.conversations.length}`);
    const conversation = conversations.conversations.find(
      (e) => e.other == other || e.startedBy == other,
    );

    if (conversation) {
      return conversation.id;
    }
  }
  const conversation = await svc.createConversation(other);

  console.log(`Created Conversation`);
  if (conversation.bundle) {
    const bundle = new libsignal.PreKeyBundle(
      conversation.bundle!.registrationId,
      conversation.bundle!.deviceId,
      conversation.bundle!.preKeyId,
      libsignal.PublicKey.deserialize(conversation.bundle!.prePublicKey),
      conversation.bundle!.signedPreKeyId,
      libsignal.PublicKey.deserialize(conversation.bundle!.signedPrePublicKey),
      conversation.bundle!.signedPreKeySignature,
      libsignal.PublicKey.deserialize(conversation.bundle!.identityPublicKey),
      conversation.bundle!.KEMPreKeyId,
      libsignal.KEMPublicKey.deserialize(conversation.bundle!.KEMPrePublicKey),
      conversation.bundle!.KEMPreKeySignature,
    );

    await libsignal.processPreKeyBundle(
      bundle,
      new libsignal.ProtocolAddress(other, 1),
      mySessionStore,
      myIdentityStore,
      libsignal.UsePQRatchet.Yes,
      BigInt(Date.now()),
    );
  }

  return conversation.conversationId;
}

async function connectToWs(getAuthToken: () => Promise<string>) {
  const onMsgCallback = async (msg: protos.ServerMessage) => {
    console.log(`Received A Message`);
    if (msg.userMessage) {
      const from = msg.userMessage.from;
      const convoId = msg.userMessage.conversationId;
      const msgId = ulidFromBytes(msg.userMessage.id);
      const otherAddress = new libsignal.ProtocolAddress(from, 1);

      switch (msg.userMessage.type) {
        case libsignal.CiphertextMessageType.PreKey: {
          const payload = await libsignal.signalDecryptPreKey(
            libsignal.PreKeySignalMessage.deserialize(msg.userMessage.text),
            otherAddress,
            mySessionStore,
            myIdentityStore,
            myPreKeys,
            mySignedPreKeys,
            myKyberPreKeys,
            libsignal.UsePQRatchet.Yes,
          );

          console.log({ msgId, convoId, from, payload: utf8Decode(payload) });

          break;
        }

        case libsignal.CiphertextMessageType.Whisper: {
          const payload = await libsignal.signalDecrypt(
            libsignal.SignalMessage.deserialize(msg.userMessage.text),
            otherAddress,
            mySessionStore,
            myIdentityStore,
          );
          console.log({ msgId, convoId, from, payload: utf8Decode(payload) });
          break;
        }

        default:
          console.error(`unhandled cipher type ${msg.userMessage.type}`);
      }
    }
  };
  const ws = new FireflyWsClient(
    "ws://localhost:39205",
    getAuthToken,
    onMsgCallback,
    () => console.error(`Retries exceeded`),
  );

  await ws.initialize();
}

let me = "alice";
let other = "bob";
// const me = "bob"
// const other = "alice"

let svc: FireflyService | undefined;

let sender: undefined | ((txt: string) => void);

for await (const line of console) {
  if (line == "upload") {
    await uploadBundles(svc!, me);
  } else if (line === "main") {
    sender = await main(svc!, me, other);
    console.log(`Got Sender`);
  } else if (line == "alice") {
    me = "alice";
    other = "bob";
    svc = new FireflyService(baseUrl, getAuthTokenByName(me)
    );
    console.log({ me, other });
  } else if (line == "bob") {
    me = "bob";
    other = "alice";
    svc = new FireflyService(baseUrl, getAuthTokenByName(me), 
    );
    console.log({ me, other });
  } else if (line == "send") {
    const msg = `Hi, I'm ${me}, Are you ${other}? Timestamp: ${new Date()}`;
    if (sender) {
      sender(msg);
    }
  } else if (line == "ws") {
    connectToWs(svc!.getAuthToken);
  } else {
    console.error(`Invalid line`);
  }
}
