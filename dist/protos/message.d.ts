import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
export declare const protobufPackage = "firefly";
export declare enum CallMessageType {
    none = 0,
    request = 1,
    reject = 2,
    end = 3,
    /** ended - for saving call messages */
    ended = 4,
    rejected = 5,
    /** candidate - webrtc messages */
    candidate = 10,
    answer = 11,
    offer = 12,
    UNRECOGNIZED = -1
}
export declare function callMessageTypeFromJSON(object: any): CallMessageType;
export declare function callMessageTypeToJSON(object: CallMessageType): string;
export interface UserMessage {
    id: bigint;
    toId: bigint;
    fromId: bigint;
    text: Uint8Array;
    type: number;
    /** flags for server to notify or just send or don't send */
    settings: number;
    /** optional sends these for decryption purposes */
    fromUsername: string;
    fromDeviceId: number;
}
export interface Group {
    id: bigint;
    name: string;
    description: string;
    pfp: boolean;
    state: Uint8Array;
}
export interface Groups {
    groups: Group[];
}
export interface UserMessages {
    messages: UserMessage[];
}
export interface GroupInvite {
    groupId: bigint;
    inviter: string;
    invitee: string;
    welcomeMessage: Uint8Array;
    commitId: bigint;
}
export interface GroupCommitAndWelcome {
    id: bigint;
    groupId: bigint;
    commitMessage: Uint8Array;
    inviter: string;
    invitee: string;
    welcomeMessage: Uint8Array;
    inviteeAddresses: bigint[];
}
export interface GroupInvites {
    invites: GroupInvite[];
}
export interface GroupMessage {
    id: bigint;
    groupId: bigint;
    message: Uint8Array;
}
export interface GroupKeyPackage {
    id: number;
    package: Uint8Array;
    address: bigint;
    username: string;
}
export interface GroupKeyPackages {
    packages: GroupKeyPackage[];
}
export interface GroupMessages {
    messages: GroupMessage[];
}
export interface GroupSyncRequest {
    groupId: bigint;
    startAfter: bigint;
    until: bigint;
    limit: number;
}
export interface GroupSyncRequests {
    requests: GroupSyncRequest[];
}
export interface GroupReAddRequest {
    groupId: bigint;
    addressId: bigint;
    username: string;
}
export interface GroupReAddRequests {
    requests: GroupReAddRequest[];
}
export interface Error {
    errorCode: number;
    error: string;
}
export interface Result {
    resultCode: number;
    body: Uint8Array;
}
export interface Address {
    id: bigint;
    username: string;
    deviceId: number;
    fcmToken: string;
}
export interface Addresses {
    addresses: Address[];
}
export interface UploadUserMessage {
    messages: UserMessage[];
}
export interface MessageIdAndTo {
    id: bigint;
    to: bigint;
    isSelf: boolean;
}
export interface UserMessageUploaded {
    messageIds: MessageIdAndTo[];
}
export interface Request {
    id: number;
    createUserMessage?: UserMessage | undefined;
    uploadUserMessage?: UploadUserMessage | undefined;
    uploadGroupMessage?: GroupMessage | undefined;
}
export interface Response {
    id: number;
    error: Error | undefined;
    createdUserMessage?: UserMessage | undefined;
    userMessageUploaded?: UserMessageUploaded | undefined;
    groupMessageUploaded?: GroupMessage | undefined;
}
export interface ServerMessage {
    userMessage?: UserMessage | undefined;
    groupMessage?: GroupMessage | undefined;
    userMessages?: UserMessages | undefined;
    groupMessages?: GroupMessages | undefined;
    response?: Response | undefined;
    ping?: Uint8Array | undefined;
    pong?: Uint8Array | undefined;
}
export interface SubscribeGroup {
    id: bigint;
}
export interface UnSubscribeGroup {
    id: bigint;
}
export interface ClientMessage {
    userMessage?: UserMessage | undefined;
    groupMessage?: GroupMessage | undefined;
    userMessages?: UserMessages | undefined;
    groupMessages?: GroupMessages | undefined;
    bearerToken?: string | undefined;
    subscribeGroup?: SubscribeGroup | undefined;
    unSubscribeGroup?: UnSubscribeGroup | undefined;
    request?: Request | undefined;
    ping?: Uint8Array | undefined;
    pong?: Uint8Array | undefined;
}
export interface GroupId {
    id: bigint;
}
export interface AuthToken {
    username: string;
    validUntil: bigint;
    issuer: string;
    credential: Uint8Array;
    deviceId: number;
    addressId: bigint;
}
export interface SignedToken {
    kid: string;
    payload: Uint8Array;
    signature: Uint8Array;
}
export interface FireflyIdentity {
    secret: Uint8Array;
    public: Uint8Array;
    credential: Uint8Array;
}
export interface FireflyGroupExtension {
    name: string;
    roles: FireflyGroupRoles | undefined;
    channels: FireflyGroupChannels | undefined;
    members: FireflyGroupMembers | undefined;
}
export interface FireflyGroupRole {
    id: number;
    name: string;
    permissions: number;
}
export interface FireflyGroupRoles {
    roles: FireflyGroupRole[];
}
export interface FireflyGroupMember {
    username: string;
    role: number;
}
export interface FireflyGroupMembers {
    members: FireflyGroupMember[];
}
export interface FireflyGroupChannel {
    id: number;
    name: string;
    type: number;
    roles: FireflyGroupRoles | undefined;
}
export interface FireflyGroupChannels {
    channels: FireflyGroupChannel[];
}
export interface PreKeyBundle {
    registrationId: number;
    deviceId: number;
    preKeyId: number;
    prePublicKey: Uint8Array;
    signedPreKeyId: number;
    signedPrePublicKey: Uint8Array;
    signedPreKeySignature: Uint8Array;
    identityPublicKey: Uint8Array;
    KEMPreKeyId: number;
    KEMPrePublicKey: Uint8Array;
    KEMPreKeySignature: Uint8Array;
}
export interface PreKeyBundleEntry {
    id: number;
    address: bigint;
    bundle: PreKeyBundle | undefined;
    username: string;
    deviceId: number;
}
export interface PreKeyBundleEntries {
    entries: PreKeyBundleEntry[];
}
export interface ConversationStart {
    conversationId: bigint;
    startedBy: string;
    other: string;
    bundle: PreKeyBundle | undefined;
}
export interface PreKeyBundles {
    bundles: PreKeyBundle[];
}
export interface Conversation {
    user1: string;
    user2: string;
    settings: bigint;
}
export interface Conversations {
    conversations: Conversation[];
}
export interface EncryptedFile {
    url: string;
    contentType: number;
    secretKey: Uint8Array;
    contentLength: number;
}
export interface EncryptedFiles {
    files: EncryptedFile[];
}
export interface MessagePayload {
    text: string;
    replyingTo: bigint;
    files: EncryptedFiles | undefined;
}
export interface CallMessage {
    message: Uint8Array;
    sessionId: number;
    type: CallMessageType;
    jsonBody: string;
}
export interface SelfUserMessage {
    to: string;
    /** UserMessageInner encrypted */
    inner: Uint8Array;
}
export interface UserMessageInner {
    plainText?: Uint8Array | undefined;
    callMessage?: CallMessage | undefined;
    messagePayload?: MessagePayload | undefined;
    selfMessage?: SelfUserMessage | undefined;
}
export interface GroupMessageInner {
    channelId: number;
    messagePayload?: MessagePayload | undefined;
}
export declare const UserMessage: MessageFns<UserMessage>;
export declare const Group: MessageFns<Group>;
export declare const Groups: MessageFns<Groups>;
export declare const UserMessages: MessageFns<UserMessages>;
export declare const GroupInvite: MessageFns<GroupInvite>;
export declare const GroupCommitAndWelcome: MessageFns<GroupCommitAndWelcome>;
export declare const GroupInvites: MessageFns<GroupInvites>;
export declare const GroupMessage: MessageFns<GroupMessage>;
export declare const GroupKeyPackage: MessageFns<GroupKeyPackage>;
export declare const GroupKeyPackages: MessageFns<GroupKeyPackages>;
export declare const GroupMessages: MessageFns<GroupMessages>;
export declare const GroupSyncRequest: MessageFns<GroupSyncRequest>;
export declare const GroupSyncRequests: MessageFns<GroupSyncRequests>;
export declare const GroupReAddRequest: MessageFns<GroupReAddRequest>;
export declare const GroupReAddRequests: MessageFns<GroupReAddRequests>;
export declare const Error: MessageFns<Error>;
export declare const Result: MessageFns<Result>;
export declare const Address: MessageFns<Address>;
export declare const Addresses: MessageFns<Addresses>;
export declare const UploadUserMessage: MessageFns<UploadUserMessage>;
export declare const MessageIdAndTo: MessageFns<MessageIdAndTo>;
export declare const UserMessageUploaded: MessageFns<UserMessageUploaded>;
export declare const Request: MessageFns<Request>;
export declare const Response: MessageFns<Response>;
export declare const ServerMessage: MessageFns<ServerMessage>;
export declare const SubscribeGroup: MessageFns<SubscribeGroup>;
export declare const UnSubscribeGroup: MessageFns<UnSubscribeGroup>;
export declare const ClientMessage: MessageFns<ClientMessage>;
export declare const GroupId: MessageFns<GroupId>;
export declare const AuthToken: MessageFns<AuthToken>;
export declare const SignedToken: MessageFns<SignedToken>;
export declare const FireflyIdentity: MessageFns<FireflyIdentity>;
export declare const FireflyGroupExtension: MessageFns<FireflyGroupExtension>;
export declare const FireflyGroupRole: MessageFns<FireflyGroupRole>;
export declare const FireflyGroupRoles: MessageFns<FireflyGroupRoles>;
export declare const FireflyGroupMember: MessageFns<FireflyGroupMember>;
export declare const FireflyGroupMembers: MessageFns<FireflyGroupMembers>;
export declare const FireflyGroupChannel: MessageFns<FireflyGroupChannel>;
export declare const FireflyGroupChannels: MessageFns<FireflyGroupChannels>;
export declare const PreKeyBundle: MessageFns<PreKeyBundle>;
export declare const PreKeyBundleEntry: MessageFns<PreKeyBundleEntry>;
export declare const PreKeyBundleEntries: MessageFns<PreKeyBundleEntries>;
export declare const ConversationStart: MessageFns<ConversationStart>;
export declare const PreKeyBundles: MessageFns<PreKeyBundles>;
export declare const Conversation: MessageFns<Conversation>;
export declare const Conversations: MessageFns<Conversations>;
export declare const EncryptedFile: MessageFns<EncryptedFile>;
export declare const EncryptedFiles: MessageFns<EncryptedFiles>;
export declare const MessagePayload: MessageFns<MessagePayload>;
export declare const CallMessage: MessageFns<CallMessage>;
export declare const SelfUserMessage: MessageFns<SelfUserMessage>;
export declare const UserMessageInner: MessageFns<UserMessageInner>;
export declare const GroupMessageInner: MessageFns<GroupMessageInner>;
type Builtin = Date | Function | Uint8Array | string | number | boolean | bigint | undefined;
export type DeepPartial<T> = T extends Builtin ? T : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>> : T extends {} ? {
    [K in keyof T]?: DeepPartial<T[K]>;
} : Partial<T>;
type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P : P & {
    [K in keyof P]: Exact<P[K], I[K]>;
} & {
    [K in Exclude<keyof I, KeysOfUnion<P>>]: never;
};
export interface MessageFns<T> {
    encode(message: T, writer?: BinaryWriter): BinaryWriter;
    decode(input: BinaryReader | Uint8Array, length?: number): T;
    fromJSON(object: any): T;
    toJSON(message: T): unknown;
    create<I extends Exact<DeepPartial<T>, I>>(base?: I): T;
    fromPartial<I extends Exact<DeepPartial<T>, I>>(object: I): T;
}
export {};
