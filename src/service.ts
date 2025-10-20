import { crockfordDecode, ULID } from "ulid";
import {
  GroupMessages,
  GroupMessage,
  GroupKeyPackages,
  GroupInvite,
  PreKeyBundles,
  UserMessage,
  UserMessages,
  ConversationStart,
  Conversations,
  Groups,
  SignedToken,
} from "./protos/message";

/**
 * Minimal ULID validator (Crockford alphabet, 26 chars)
 */
function isValidULID(u: string): u is ULID {
  return /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i.test(u);
}

/** parse little-endian u64 bytes to bigint */
function parseU64Le(buf: ArrayBuffer) {
  const dv = new DataView(buf);
  // read low and high 32-bit parts and combine to BigInt
  const low = BigInt(dv.getUint32(0, true));
  const high = BigInt(dv.getUint32(4, true));
  return (high << 32n) + low;
}

/** join array of numbers/strings into server-expected %2C encoded CSV */
function joinCsv(items: Array<string | number>) {
  return items.map(String).join("%2C");
}

export class FireflyService {
  baseUrl: string;
  getAuthToken: () => Promise<string>;
  getUsername: () => Promise<string>;

  constructor(
    baseUrl: string,
    getAuthToken: () => Promise<string>,
    getUsername: () => Promise<string>,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.getAuthToken = getAuthToken;
    this.getUsername = getUsername;
  }

  private async req(path: string, opts: RequestInit = {}) {
    const token = await this.getAuthToken();
    const url = new URL(path, this.baseUrl).toString();
    const res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  }

  // ---------- GETs ----------
  async getJWKS() {
    const res = await fetch(new URL("/jwks.json", this.baseUrl).toString(), {
      headers: { Authorization: `Bearer ${await this.getAuthToken()}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  async getGroupMessages(opts: {
    groupId?: number;
    startAfter?: ULID;
    limit?: number;
  }) {
    if (!opts.groupId && !opts.startAfter)
      throw new Error("groupId or startAfter required");
    if (opts.startAfter && !isValidULID(opts.startAfter))
      throw new Error("invalid ULID");

    const url = new URL("/group/messages", this.baseUrl);
    if (opts.groupId != null)
      url.searchParams.set("groupId", String(opts.groupId));
    if (opts.startAfter)
      url.searchParams.set("startAfter", opts.startAfter.toString());
    if (opts.limit != null)
      url.searchParams.set(
        "limit",
        String(Math.max(1, Math.min(1000, Math.floor(opts.limit)))),
      );

    const res = await this.req(url.pathname + url.search);
    return GroupMessages.decode(new Uint8Array(await res.arrayBuffer()));
  }

  async getKeyPackages() {
    const res = await this.req("/group/keyPackages");
    return GroupKeyPackages.decode(new Uint8Array(await res.arrayBuffer()));
  }

  async getKeyPackage(username: string) {
    if (!username) throw new Error("username required");
    const url = new URL("/group/keyPackage", this.baseUrl);
    url.searchParams.set("username", username);
    const res = await this.req(url.pathname + url.search);
    const arr = new Uint8Array(await res.arrayBuffer());
    return arr; // raw protobuf bytes for a single GroupKeyPackage (server returns proto or empty)
  }

  async getUserMessages(opts: {
    conversationId?: number;
    startAfter?: ULID;
    limit?: number;
  }) {
    if (!opts.conversationId && !opts.startAfter)
      throw new Error("conversationId or startAfter required");
    if (opts.startAfter && !isValidULID(opts.startAfter))
      throw new Error("invalid ULID");

    const url = new URL("/user/messages", this.baseUrl);
    if (opts.conversationId != null)
      url.searchParams.set("conversationId", String(opts.conversationId));
    if (opts.startAfter)
      url.searchParams.set("startAfter", opts.startAfter.toString());
    if (opts.limit != null)
      url.searchParams.set(
        "limit",
        String(Math.max(1, Math.min(1000, Math.floor(opts.limit)))),
      );

    const res = await this.req(url.pathname + url.search);
    return UserMessages.decode(new Uint8Array(await res.arrayBuffer()));
  }

  async getConversations() {
    const res = await this.req("/user/conversations");
    return Conversations.decode(new Uint8Array(await res.arrayBuffer()));
  }

  async getGroups() {
    const res = await this.req("/groups");
    return Groups.decode(new Uint8Array(await res.arrayBuffer()));
  }

  // ---------- POSTs ----------
  async sign(credential: Uint8Array): Promise<SignedToken> {
    const res = await this.req("/sign", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Uint8Array(credential),
    });
    return SignedToken.decode(new Uint8Array(await res.arrayBuffer()));
  }

  async createGroup(protoBytes: Uint8Array): Promise<bigint> {
    const res = await this.req("/group", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Uint8Array(protoBytes),
    });
    const buf = await res.arrayBuffer(); // server returns u64 LE
    return parseU64Le(buf);
  }

  async uploadKeyPackages(packages: GroupKeyPackages) {
    const body = GroupKeyPackages.encode(packages).finish();
    const res = await this.req("/group/keyPackages", { method: "POST", body });
    return GroupKeyPackages.decode(new Uint8Array(await res.arrayBuffer()));
  }

  async postGroupMessage(groupId: bigint, message: Uint8Array) {
    const msg = GroupMessage.create({ groupId, message });
    const res = await this.req("/group/message", {
      method: "POST",
      body: GroupMessage.encode(msg).finish(),
    });
    return new Uint8Array(await res.arrayBuffer()); // server returns UUID bytes of message id
  }

  async postCommit(groupId: bigint, message: Uint8Array) {
    const msg = GroupMessage.create({ groupId, message });
    const res = await this.req("/group/commit", {
      method: "POST",
      body: GroupMessage.encode(msg).finish(),
    });
    return new Uint8Array(await res.arrayBuffer()); // commit id bytes
  }

  async invite(
    groupId: bigint,
    invitee: string,
    welcomeMessage: Uint8Array,
    commitId: ULID,
  ) {
    if (!isValidULID(commitId)) throw new Error("invalid commitId ULID");
    const commitBytes = crockfordDecode(commitId); // assumes this yields 16 bytes (server expects UUID bytes)
    const invite = GroupInvite.create({
      groupId,
      invitee,
      welcomeMessage,
      commitId: commitBytes as any,
    });
    await this.req("/group/invite", {
      method: "POST",
      body: GroupInvite.encode(invite).finish(),
    });
  }

  async requestReAdd(groupId: number) {
    const url = new URL("/group/reAdd", this.baseUrl);
    url.searchParams.set("groupId", String(groupId));
    await this.req(url.pathname + url.search);
  }

  async uploadPreKeyBundles(bundles: PreKeyBundles) {
    const body = PreKeyBundles.encode(bundles).finish();
    await this.req("/user/preKeyBundles", { method: "POST", body });
  }

  async postUserMessage(conversationId: bigint, text: Uint8Array) {
    const msg = UserMessage.create({ conversationId, text });
    const res = await this.req("/user/message", {
      method: "POST",
      body: UserMessage.encode(msg).finish(),
    });
    return new Uint8Array(await res.arrayBuffer()); // uuid bytes
  }

  async createConversation(otherUsername: string) {
    if (!otherUsername) throw new Error("other username required");
    const url = new URL("/user/conversation", this.baseUrl);
    url.searchParams.set("other", otherUsername);
    const res = await this.req(url.pathname + url.search);
    return ConversationStart.decode(new Uint8Array(await res.arrayBuffer()));
  }

  // ---------- DELETEs ----------
  async deleteGroup(id: number) {
    const url = new URL("/group", this.baseUrl);
    url.searchParams.set("id", String(id));
    await this.req(url.pathname + url.search, { method: "DELETE" });
  }

  async deleteGroupMember(uname: string, groupId: number) {
    if (!uname) throw new Error("uname required");
    const url = new URL("/group/member", this.baseUrl);
    url.searchParams.set("uname", uname);
    url.searchParams.set("groupId", String(groupId));
    await this.req(url.pathname + url.search, { method: "DELETE" });
  }

  async deleteGroupInvites(commitIds: ULID[]) {
    if (!commitIds.length) return;
    for (const c of commitIds)
      if (!isValidULID(c)) throw new Error("invalid ULID in commitIds");
    const url = new URL("/group/invites", this.baseUrl);
    url.searchParams.set("commitIds", joinCsv(commitIds));
    await this.req(url.pathname + url.search, { method: "DELETE" });
  }

  async deleteKeyPackages(ids: number[]) {
    if (!ids.length) return;
    const url = new URL("/group/keyPackages", this.baseUrl);
    url.searchParams.set("ids", joinCsv(ids));
    await this.req(url.pathname + url.search, { method: "DELETE" });
  }

  async deletePreKeyBundles(ids: number[]) {
    if (!ids.length) return;
    const url = new URL("/user/preKeyBundle", this.baseUrl);
    url.searchParams.set("ids", joinCsv(ids));
    await this.req(url.pathname + url.search, { method: "DELETE" });
  }

  async deleteConversation(id: number) {
    const url = new URL("/user/conversation", this.baseUrl);
    url.searchParams.set("id", String(id));
    await this.req(url.pathname + url.search, { method: "DELETE" });
  }
}
