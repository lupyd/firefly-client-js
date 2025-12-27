"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FireflyService = exports.HttpError = void 0;
// import { crockfordDecode, ULID } from "ulid";
const message_1 = require("./protos/message");
/**
 * Minimal ULID validator (Crockford alphabet, 26 chars)
 */
// function isValidULID(u: string): u is ULID {
//   return /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i.test(u);
// }
/** join array of numbers/strings into server-expected %2C encoded CSV */
function joinCsv(items) {
    return items.map(String).join("%2C");
}
class HttpError extends Error {
    statusCode;
    responseText;
    constructor(statusCode, responseText) {
        super(`HTTP ${statusCode}: ${responseText}`);
        this.statusCode = statusCode;
        this.responseText = responseText;
        this.name = "HttpError";
    }
}
exports.HttpError = HttpError;
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
        if (!res.ok) {
            const responseText = await res.text();
            throw new HttpError(res.status, responseText);
        }
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
        if (!opts.groupId)
            throw new Error("groupId required");
        if (opts.startAfter && opts.startAfter < 0n)
            throw new Error("invalid startAfter");
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
    async getPreKeyBundles() {
        const res = await this.req("/user/preKeyBundles");
        return message_1.PreKeyBundles.decode(new Uint8Array(await res.arrayBuffer()));
    }
    async getUserMessages(opts) {
        if (!opts.conversationId && !opts.startAfter)
            throw new Error("conversationId or startAfter required");
        if (opts.startAfter && opts.startAfter < 0n)
            throw new Error("invalid startAfter");
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
    async getConversation(other, preKeyBundleRequired = false) {
        const url = new URL("/user/conversation", this.baseUrl);
        url.searchParams.set("other", other);
        if (preKeyBundleRequired) {
            url.searchParams.set("preKeyBundleRequired", "true");
        }
        const res = await this.req(url.pathname + url.search);
        return message_1.ConversationStart.decode(new Uint8Array(await res.arrayBuffer()));
    }
    async getPreKeyBundle(other) {
        const url = new URL("/user/preKeyBundle", this.baseUrl);
        url.searchParams.set("other", other);
        const res = await this.req(url.pathname + url.search);
        return message_1.PreKeyBundle.decode(new Uint8Array(await res.arrayBuffer()));
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
    async createGroup(group) {
        const res = await this.req("/group", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-protobuf; proto=firefly.Group",
            },
            body: new Uint8Array(message_1.Group.encode(group).finish()),
        });
        const buf = await res.arrayBuffer();
        return message_1.GroupId.decode(new Uint8Array(buf)).id;
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
        return message_1.GroupMessage.decode(new Uint8Array(await res.arrayBuffer()));
    }
    async postCommit(groupId, message) {
        const msg = message_1.GroupMessage.create({ groupId, message });
        const res = await this.req("/group/commit", {
            method: "POST",
            body: message_1.GroupMessage.encode(msg).finish(),
        });
        return message_1.GroupMessage.decode(new Uint8Array(await res.arrayBuffer())); // commit id bytes
    }
    async invite(groupId, invitee, welcomeMessage, commitId) {
        if (commitId < 0n)
            throw new Error("invalid commitId ULID");
        const invite = message_1.GroupInvite.create({
            groupId,
            invitee,
            welcomeMessage,
            commitId,
        });
        const res = await this.req("/group/invite", {
            method: "POST",
            body: message_1.GroupInvite.encode(invite).finish(),
        });
    }
    async requestReAdd(groupId) {
        const url = new URL("/group/reAdd", this.baseUrl);
        url.searchParams.set("groupId", String(groupId));
        await this.req(url.pathname + url.search);
    }
    // async uploadPreKeyBundles(bundles: PreKeyBundles) {
    //   const body = PreKeyBundles.encode(bundles).finish();
    //   await this.req("/user/preKeyBundles", { method: "POST", body });
    // }
    // async postUserMessage(
    //   conversationId: bigint,
    //   text: Uint8Array,
    //   type: number,
    // ) {
    //   const msg = UserMessage.create({ text, type });
    //   const res = await this.req("/user/message", {
    //     method: "POST",
    //     body: UserMessage.encode(msg).finish(),
    //   });
    //   return UserMessage.decode(new Uint8Array(await res.arrayBuffer()));
    // }
    // async createConversation(otherUsername: string) {
    //   if (!otherUsername) throw new Error("other username required");
    //   const url = new URL("/user/conversation", this.baseUrl);
    //   url.searchParams.set("other", otherUsername);
    //   const res = await this.req(url.pathname + url.search, { method: "POST" });
    //   const buffer = new Uint8Array(await res.arrayBuffer());
    //   return ConversationStart.decode(buffer);
    // }
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
            if (c < 0n)
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
    async deleteConversations(ids) {
        const url = new URL("/user/conversations", this.baseUrl);
        url.searchParams.set("ids", joinCsv(ids));
        await this.req(url.pathname + url.search, { method: "DELETE" });
    }
    // async syncUserMessages(since: bigint, limit: number) {
    //   const url = new URL("/user/sync", this.baseUrl);
    //   url.searchParams.set("since", since.toString());
    //   url.searchParams.set("limit", limit.toString());
    //   const response = await this.req(url.pathname + url.search);
    //   return UserMessages.decode(new Uint8Array(await response.arrayBuffer()));
    // }
    async deleteUserMessages(until) {
        const url = new URL("/user/messages", this.baseUrl);
        url.searchParams.set("until", until.toString());
        await this.req(url.pathname + url.search, { method: "DELETE" });
    }
    async recreateConversations() {
        await this.req("/user/conversations", { method: "PATCH" });
    }
    async getWebrtcConfig() {
        const response = await this.req("/webrtcConfig");
        const body = await response.text();
        return JSON.parse(body);
    }
    async deleteUserMessage(convoId, msgId) {
        return await this.req(`/user/message?conversationId=${convoId}&messageId=${msgId}`, { method: "DELETE" });
    }
}
exports.FireflyService = FireflyService;
