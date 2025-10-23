import { FireflyService } from "../src/service";
import { FireflyClient, protos } from "../src/index";
import * as libsignal from "@signalapp/libsignal-client";
import { Conversation } from "../src/protos/message";
import {
  IndexedDbIdentityKeyStore,
  IndexedDbKyberPreKeyStore,
  IndexedDbPreKeyStore,
  IndexedDbSessionStore,
  IndexedDbSignedPreKeyStore,
  resetDb,
} from "../src/store";
import {
  crockfordDecode,
  crockfordEncode,
  ULID,
  ULIDError,
  ulidToUUID,
} from "ulid";
import {
  InMemoryIdentityKeyStore,
  InMemoryKyberKeyStore,
  InMemoryPreKeyStore,
  InMemorySessionStore,
  InMemorySignedPreKeyStore,
} from "./encrypted";

const baseUrl = "http://localhost:39205";

const randInt = () => Math.floor(Math.random() * 99999);
const getAuthTokenByName = (name: string) => () => Promise.resolve(name);

const myIdentityStore = new InMemoryIdentityKeyStore();
const myPreKeys = new InMemoryPreKeyStore();
const mySignedPreKeys = new InMemorySignedPreKeyStore();
const myKyberPreKeys = new InMemoryKyberKeyStore();
const mySessionStore = new InMemorySessionStore();

async function main(svc: FireflyService, me: string, other: string) {
  let conversationId = await getConversation(svc, other);

  // const msg = `Hi, I'm ${me}, Are you ${other}? Timestamp: ${new Date()}`;

  const bobAddress = libsignal.ProtocolAddress.new(other, 1);
  return async (txt: string) => {
    const cipherText = await libsignal.signalEncrypt(
      utf8Encode(txt),
      bobAddress,
      mySessionStore,
      myIdentityStore,
      new Date(),
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
        new Date(),
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

async function uploadBundles(svc: FireflyService) {
  const myAddress = libsignal.ProtocolAddress.new(await svc.getUsername(), 1);
  // const myIdentityStore = new IndexedDbIdentityKeyStore();
  // const myPreKeys = new IndexedDbPreKeyStore();
  // const mySignedPreKeys = new IndexedDbSignedPreKeyStore();
  // const myKyberPreKeys = new IndexedDbKyberPreKeyStore();
  // const mySessionStore = new IndexedDbSessionStore();

  const identityKey = await myIdentityStore.getIdentityKey();

  const bundles = protos.PreKeyBundles.create();

  for (let i = 0; i < 8; i++) {
    const registrationId = await myIdentityStore.getLocalRegistrationId();

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

    await myPreKeys.savePreKey(
      preKeyId,
      libsignal.PreKeyRecord.new(preKeyId, preKey.getPublicKey(), preKey),
    );

    await mySignedPreKeys.saveSignedPreKey(
      signedPreKeyId,
      libsignal.SignedPreKeyRecord.new(
        signedPreKeyId,
        Date.now(),
        sPreKey.getPublicKey(),
        sPreKey,
        signedPreKeySignature,
      ),
    );

    await myKyberPreKeys.saveKyberPreKey(
      KEMPreKeyId,
      libsignal.KyberPreKeyRecord.new(
        KEMPreKeyId,
        Date.now(),
        KEMPreKey,
        KEMPreKeySignature,
      ),
    );
  }

  await svc.uploadPreKeyBundles(bundles);
}

// document.querySelector("#start")?.addEventListener("click", async (_) => {
//   const me = document.querySelector("#me") as HTMLInputElement;
//   const other = document.querySelector("#other") as HTMLInputElement;

//   const getAuthToken = getAuthTokenByName(me.value);

//   const svc = new FireflyService(baseUrl, getAuthToken, () =>
//     Promise.resolve(me.value),
//   );

//   await uploadBundles(svc);

//   document.querySelector("#send")?.addEventListener("click", (_) => {
//     main(svc, me.value, other.value);
//   });
// });

// document.querySelector("#reset-db")?.addEventListener("click", (_) => {
//   resetDb();
// }

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
    const bundle = libsignal.PreKeyBundle.new(
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
      libsignal.ProtocolAddress.new(other, 1),
      mySessionStore,
      myIdentityStore,
      libsignal.UsePQRatchet.Yes,
      new Date(),
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
      const otherAddress = libsignal.ProtocolAddress.new(from, 1);

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
  const ws = new FireflyClient(
    baseUrl,
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
    await uploadBundles(svc!);
  } else if (line === "main") {
    sender = await main(svc!, me, other);
    console.log(`Got Sender`);
  } else if (line == "alice") {
    me = "alice";
    other = "bob";
    svc = new FireflyService(baseUrl, getAuthTokenByName(me), () =>
      Promise.resolve(me),
    );
    console.log({ me, other });
  } else if (line == "bob") {
    me = "bob";
    other = "alice";
    svc = new FireflyService(baseUrl, getAuthTokenByName(me), () =>
      Promise.resolve(me),
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
