import { GroupMessages, GroupKeyPackages, PreKeyBundles, UserMessages, ConversationStart, Conversations, Groups, SignedToken, Conversation, GroupKeyPackage } from "./protos/message";
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
    getUserMessages(opts: {
        conversationId?: number;
        startAfter?: bigint;
        limit?: number;
    }): Promise<UserMessages>;
    getConversations(): Promise<Conversations>;
    getConversation(other: string): Promise<Conversation>;
    getGroups(): Promise<Groups>;
    sign(credential: Uint8Array): Promise<SignedToken>;
    createGroup(protoBytes: Uint8Array): Promise<bigint>;
    uploadKeyPackages(packages: GroupKeyPackages): Promise<GroupKeyPackages>;
    postGroupMessage(groupId: bigint, message: Uint8Array): Promise<Uint8Array<ArrayBuffer>>;
    postCommit(groupId: bigint, message: Uint8Array): Promise<Uint8Array<ArrayBuffer>>;
    invite(groupId: bigint, invitee: string, welcomeMessage: Uint8Array, commitId: bigint): Promise<void>;
    requestReAdd(groupId: number): Promise<void>;
    uploadPreKeyBundles(bundles: PreKeyBundles): Promise<void>;
    postUserMessage(conversationId: bigint, text: Uint8Array, type: number): Promise<Uint8Array<ArrayBuffer>>;
    createConversation(otherUsername: string): Promise<ConversationStart>;
    deleteGroup(id: number): Promise<void>;
    deleteGroupMember(uname: string, groupId: number): Promise<void>;
    deleteGroupInvites(commitIds: bigint[]): Promise<void>;
    deleteKeyPackages(ids: number[]): Promise<void>;
    deletePreKeyBundles(ids: number[]): Promise<void>;
    deleteConversation(id: number): Promise<void>;
}
