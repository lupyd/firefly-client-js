"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FireflyService = void 0;
const ulid_1 = require("ulid");
const message_1 = require("./protos/message");
/**
 * Minimal ULID validator (Crockford alphabet, 26 chars)
 */
function isValidULID(u) {
    return /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i.test(u);
}
/** parse little-endian u64 bytes to bigint */
function parseU64Le(buf) {
    const dv = new DataView(buf);
    // read low and high 32-bit parts and combine to BigInt
    const low = BigInt(dv.getUint32(0, true));
    const high = BigInt(dv.getUint32(4, true));
    return (high << 32n) + low;
}
/** join array of numbers/strings into server-expected %2C encoded CSV */
function joinCsv(items) {
    return items.map(String).join("%2C");
}
class FireflyService {
    baseUrl;
    getAuthToken;
    constructor(baseUrl, getAuthToken) {
        this.baseUrl = baseUrl.replace(/\/$/, "");
        this.getAuthToken = getAuthToken;
    }
    async req(path, opts = {}) {
        const token = await this.getAuthToken();
        const url = new URL(path, this.baseUrl).toString();
        const res = await fetch(url, {
            ...opts,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(opts.headers || {}),
            },
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status} ${await res.text()}`);
        return res;
    }
    // ---------- GETs ----------
    async getJWKS() {
        const res = await fetch(new URL("/jwks.json", this.baseUrl).toString(), {
            headers: { Authorization: `Bearer ${await this.getAuthToken()}` },
        });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        return res.json();
    }
    async getGroupMessages(opts) {
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
            url.searchParams.set("limit", String(Math.max(1, Math.min(1000, Math.floor(opts.limit)))));
        const res = await this.req(url.pathname + url.search);
        return message_1.GroupMessages.decode(new Uint8Array(await res.arrayBuffer()));
    }
    async getKeyPackages() {
        const res = await this.req("/group/keyPackages");
        return message_1.GroupKeyPackages.decode(new Uint8Array(await res.arrayBuffer()));
    }
    async getKeyPackage(username) {
        if (!username)
            throw new Error("username required");
        const url = new URL("/group/keyPackage", this.baseUrl);
        url.searchParams.set("username", username);
        const res = await this.req(url.pathname + url.search);
        const arr = new Uint8Array(await res.arrayBuffer());
        return message_1.GroupKeyPackage.decode(arr);
    }
    async getUserMessages(opts) {
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
            url.searchParams.set("limit", String(Math.max(1, Math.min(1000, Math.floor(opts.limit)))));
        const res = await this.req(url.pathname + url.search);
        return message_1.UserMessages.decode(new Uint8Array(await res.arrayBuffer()));
    }
    async getConversations() {
        const res = await this.req("/user/conversations");
        return message_1.Conversations.decode(new Uint8Array(await res.arrayBuffer()));
    }
    async getConversation(other) {
        const url = new URL("/user/messages", this.baseUrl);
        url.searchParams.set("other", other);
        const res = await this.req(url.pathname + url.search);
        return message_1.Conversation.decode(new Uint8Array(await res.arrayBuffer()));
    }
    async getGroups() {
        const res = await this.req("/groups");
        return message_1.Groups.decode(new Uint8Array(await res.arrayBuffer()));
    }
    // ---------- POSTs ----------
    async sign(credential) {
        const res = await this.req("/sign", {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: new Uint8Array(credential),
        });
        return message_1.SignedToken.decode(new Uint8Array(await res.arrayBuffer()));
    }
    async createGroup(protoBytes) {
        const res = await this.req("/group", {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: new Uint8Array(protoBytes),
        });
        const buf = await res.arrayBuffer(); // server returns u64 LE
        return parseU64Le(buf);
    }
    async uploadKeyPackages(packages) {
        const body = message_1.GroupKeyPackages.encode(packages).finish();
        const res = await this.req("/group/keyPackages", { method: "POST", body });
        return message_1.GroupKeyPackages.decode(new Uint8Array(await res.arrayBuffer()));
    }
    async postGroupMessage(groupId, message) {
        const msg = message_1.GroupMessage.create({ groupId, message });
        const res = await this.req("/group/message", {
            method: "POST",
            body: message_1.GroupMessage.encode(msg).finish(),
        });
        return new Uint8Array(await res.arrayBuffer()); // server returns UUID bytes of message id
    }
    async postCommit(groupId, message) {
        const msg = message_1.GroupMessage.create({ groupId, message });
        const res = await this.req("/group/commit", {
            method: "POST",
            body: message_1.GroupMessage.encode(msg).finish(),
        });
        return new Uint8Array(await res.arrayBuffer()); // commit id bytes
    }
    async invite(groupId, invitee, welcomeMessage, commitId) {
        if (!isValidULID(commitId))
            throw new Error("invalid commitId ULID");
        const commitBytes = (0, ulid_1.crockfordDecode)(commitId); // assumes this yields 16 bytes (server expects UUID bytes)
        const invite = message_1.GroupInvite.create({
            groupId,
            invitee,
            welcomeMessage,
            commitId: commitBytes,
        });
        await this.req("/group/invite", {
            method: "POST",
            body: message_1.GroupInvite.encode(invite).finish(),
        });
    }
    async requestReAdd(groupId) {
        const url = new URL("/group/reAdd", this.baseUrl);
        url.searchParams.set("groupId", String(groupId));
        await this.req(url.pathname + url.search);
    }
    async uploadPreKeyBundles(bundles) {
        const body = message_1.PreKeyBundles.encode(bundles).finish();
        await this.req("/user/preKeyBundles", { method: "POST", body });
    }
    async postUserMessage(conversationId, text, type) {
        const msg = message_1.UserMessage.create({ conversationId, text, type });
        const res = await this.req("/user/message", {
            method: "POST",
            body: message_1.UserMessage.encode(msg).finish(),
        });
        return new Uint8Array(await res.arrayBuffer()); // uuid bytes
    }
    async createConversation(otherUsername) {
        if (!otherUsername)
            throw new Error("other username required");
        const url = new URL("/user/conversation", this.baseUrl);
        url.searchParams.set("other", otherUsername);
        const res = await this.req(url.pathname + url.search, { method: "POST" });
        const buffer = new Uint8Array(await res.arrayBuffer());
        return message_1.ConversationStart.decode(buffer);
    }
    // ---------- DELETEs ----------
    async deleteGroup(id) {
        const url = new URL("/group", this.baseUrl);
        url.searchParams.set("id", String(id));
        await this.req(url.pathname + url.search, { method: "DELETE" });
    }
    async deleteGroupMember(uname, groupId) {
        if (!uname)
            throw new Error("uname required");
        const url = new URL("/group/member", this.baseUrl);
        url.searchParams.set("uname", uname);
        url.searchParams.set("groupId", String(groupId));
        await this.req(url.pathname + url.search, { method: "DELETE" });
    }
    async deleteGroupInvites(commitIds) {
        if (!commitIds.length)
            return;
        for (const c of commitIds)
            if (!isValidULID(c))
                throw new Error("invalid ULID in commitIds");
        const url = new URL("/group/invites", this.baseUrl);
        url.searchParams.set("commitIds", joinCsv(commitIds));
        await this.req(url.pathname + url.search, { method: "DELETE" });
    }
    async deleteKeyPackages(ids) {
        if (!ids.length)
            return;
        const url = new URL("/group/keyPackages", this.baseUrl);
        url.searchParams.set("ids", joinCsv(ids));
        await this.req(url.pathname + url.search, { method: "DELETE" });
    }
    async deletePreKeyBundles(ids) {
        if (!ids.length)
            return;
        const url = new URL("/user/preKeyBundle", this.baseUrl);
        url.searchParams.set("ids", joinCsv(ids));
        await this.req(url.pathname + url.search, { method: "DELETE" });
    }
    async deleteConversation(id) {
        const url = new URL("/user/conversation", this.baseUrl);
        url.searchParams.set("id", String(id));
        await this.req(url.pathname + url.search, { method: "DELETE" });
    }
}
exports.FireflyService = FireflyService;
