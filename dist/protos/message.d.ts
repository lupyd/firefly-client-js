import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
export declare const protobufPackage = "firefly";
export interface UserMessage {
    id: bigint;
    to: string;
    from: string;
    text: Uint8Array;
    conversationId: bigint;
    type: number;
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
}
export interface GroupKeyPackages {
    packages: GroupKeyPackage[];
}
export interface GroupMessages {
    messages: GroupMessage[];
}
export interface Request {
    id: number;
    createUserMessage?: UserMessage | undefined;
}
export interface Error {
    errorCode: number;
    error: string;
}
export interface Result {
    resultCode: number;
    body: Uint8Array;
}
export interface Response {
    id: number;
    error: Error | undefined;
    createdUserMessage?: UserMessage | undefined;
}
export interface ServerMessage {
    userMessage?: UserMessage | undefined;
    groupMessage?: GroupMessage | undefined;
    userMessages?: UserMessages | undefined;
    groupMessages?: GroupMessages | undefined;
    response?: Response | undefined;
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
}
export interface GroupId {
    id: bigint;
}
export interface AuthToken {
    username: string;
    validUntil: bigint;
    issuer: string;
    credential: Uint8Array;
}
export interface SignedToken {
    kid: string;
    payload: Uint8Array;
    signature: Uint8Array;
}
export interface FireflyClient {
    username: string;
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
    id: bigint;
    startedBy: string;
    other: string;
}
export interface Conversations {
    conversations: Conversation[];
}
export interface EncryptedFile {
    url: string;
    contentType: number;
    secretKey: Uint8Array;
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
}
export interface UserMessageInner {
    plainText?: Uint8Array | undefined;
    callMessage?: CallMessage | undefined;
    messagePayload?: MessagePayload | undefined;
}
export declare const UserMessage: MessageFns<UserMessage>;
export declare const Group: MessageFns<Group>;
export declare const Groups: MessageFns<Groups>;
export declare const UserMessages: MessageFns<UserMessages>;
export declare const GroupInvite: MessageFns<GroupInvite>;
export declare const GroupInvites: MessageFns<GroupInvites>;
export declare const GroupMessage: MessageFns<GroupMessage>;
export declare const GroupKeyPackage: MessageFns<GroupKeyPackage>;
export declare const GroupKeyPackages: MessageFns<GroupKeyPackages>;
export declare const GroupMessages: MessageFns<GroupMessages>;
export declare const Request: MessageFns<Request>;
export declare const Error: MessageFns<Error>;
export declare const Result: MessageFns<Result>;
export declare const Response: MessageFns<Response>;
export declare const ServerMessage: MessageFns<ServerMessage>;
export declare const SubscribeGroup: MessageFns<SubscribeGroup>;
export declare const UnSubscribeGroup: MessageFns<UnSubscribeGroup>;
export declare const ClientMessage: MessageFns<ClientMessage>;
export declare const GroupId: MessageFns<GroupId>;
export declare const AuthToken: MessageFns<AuthToken>;
export declare const SignedToken: MessageFns<SignedToken>;
export declare const FireflyClient: MessageFns<FireflyClient>;
export declare const FireflyGroupExtension: MessageFns<FireflyGroupExtension>;
export declare const FireflyGroupRole: MessageFns<FireflyGroupRole>;
export declare const FireflyGroupRoles: MessageFns<FireflyGroupRoles>;
export declare const FireflyGroupMember: MessageFns<FireflyGroupMember>;
export declare const FireflyGroupMembers: MessageFns<FireflyGroupMembers>;
export declare const FireflyGroupChannel: MessageFns<FireflyGroupChannel>;
export declare const FireflyGroupChannels: MessageFns<FireflyGroupChannels>;
export declare const PreKeyBundle: MessageFns<PreKeyBundle>;
export declare const ConversationStart: MessageFns<ConversationStart>;
export declare const PreKeyBundles: MessageFns<PreKeyBundles>;
export declare const Conversation: MessageFns<Conversation>;
export declare const Conversations: MessageFns<Conversations>;
export declare const EncryptedFile: MessageFns<EncryptedFile>;
export declare const EncryptedFiles: MessageFns<EncryptedFiles>;
export declare const MessagePayload: MessageFns<MessagePayload>;
export declare const CallMessage: MessageFns<CallMessage>;
export declare const UserMessageInner: MessageFns<UserMessageInner>;
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
