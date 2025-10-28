import { GroupMessages, GroupMessage, GroupKeyPackages, PreKeyBundles, UserMessage, UserMessages, ConversationStart, Conversations, Groups, SignedToken, GroupKeyPackage, Group, PreKeyBundle } from "./protos/message";
export declare class HttpError extends Error {
    statusCode: number;
    responseText: string;
    constructor(statusCode: number, responseText: string);
}
export declare class FireflyService {
    baseUrl: string;
    getAuthToken: () => Promise<string>;
    constructor(baseUrl: string, getAuthToken: () => Promise<string>);
    private req;
    getJWKS(): Promise<any>;
    getGroupMessages(opts: {
        groupId?: number;
        startAfter?: bigint;
        limit?: number;
    }): Promise<GroupMessages>;
    getKeyPackages(): Promise<GroupKeyPackages>;
    getKeyPackage(username: string): Promise<GroupKeyPackage>;
    getPreKeyBundles(): Promise<PreKeyBundles>;
    getUserMessages(opts: {
        conversationId?: number;
        startAfter?: bigint;
        limit?: number;
    }): Promise<UserMessages>;
    getConversations(): Promise<Conversations>;
    getConversation(other: string, preKeyBundleRequired?: boolean): Promise<ConversationStart>;
    getPreKeyBundle(other: string): Promise<PreKeyBundle>;
    getGroups(): Promise<Groups>;
    sign(credential: Uint8Array): Promise<SignedToken>;
    createGroup(group: Group): Promise<bigint>;
    uploadKeyPackages(packages: GroupKeyPackages): Promise<GroupKeyPackages>;
    postGroupMessage(groupId: bigint, message: Uint8Array): Promise<GroupMessage>;
    postCommit(groupId: bigint, message: Uint8Array): Promise<GroupMessage>;
    invite(groupId: bigint, invitee: string, welcomeMessage: Uint8Array, commitId: bigint): Promise<void>;
    requestReAdd(groupId: number): Promise<void>;
    uploadPreKeyBundles(bundles: PreKeyBundles): Promise<void>;
    postUserMessage(conversationId: bigint, text: Uint8Array, type: number): Promise<UserMessage>;
    createConversation(otherUsername: string): Promise<ConversationStart>;
    deleteGroup(id: number): Promise<void>;
    deleteGroupMember(uname: string, groupId: number): Promise<void>;
    deleteGroupInvites(commitIds: bigint[]): Promise<void>;
    deleteKeyPackages(ids: number[]): Promise<void>;
    deletePreKeyBundles(ids: number[]): Promise<void>;
    deleteConversations(ids: number[]): Promise<void>;
    syncUserMessages(since: bigint, limit: number): Promise<UserMessages>;
    deleteUserMessages(until: bigint): Promise<void>;
    recreateConversations(): Promise<void>;
}
