import { BinaryReader, BinaryWriter } from "@bufbuild/protobuf/wire";
export declare const protobufPackage = "firefly";
export interface VersionedMessage {
    version: number;
    ts: bigint;
    data: Uint8Array;
}
export interface AuthenticationToken {
    token: string;
}
export interface GroupChats {
    chats: GroupChat[];
}
export interface GroupChannel {
    groupId: number;
    channelId: number;
    channelType: number;
    name: string;
}
export interface GroupChat {
    name: string;
    groupId: number;
    channels: GroupChannel[];
}
export interface GetGroupMembers {
    groupId: number;
    channelId: number;
}
export interface GetGroupMessages {
    groupId: number;
    channelId: number;
    before: Uint8Array;
    count: number;
}
export interface AddUser {
    username: string;
    groupId: number;
    channelId: number;
    role: number;
}
export interface RemoveUser {
    username: string;
    channelId: number;
    groupId: number;
}
export interface GroupMember {
    username: string;
    lastSeen: bigint;
    isOnline: boolean;
    role: number;
    chanId: number;
}
export interface GroupChannelMessage {
    id: Uint8Array;
    groupId: number;
    channelId: number;
    content: string;
    by: string;
}
export interface GroupChannelMessages {
    messages: GroupChannelMessage[];
}
export interface GroupMembers {
    members: GroupMember[];
}
export interface GetUserMessages {
    before: Uint8Array;
    count: number;
    from: string;
}
export interface Request {
    id: number;
    getGroupMembers?: GetGroupMembers | undefined;
    getGroupMessages?: GetGroupMessages | undefined;
    addUser?: AddUser | undefined;
    removeUser?: RemoveUser | undefined;
    addChannel?: GroupChannel | undefined;
    deleteChannel?: GroupChannel | undefined;
    getUserMessages?: GetUserMessages | undefined;
}
export interface Error {
    status: number;
    error: string;
}
export interface Response {
    id: number;
    error?: Error | undefined;
    groupMembers?: GroupMembers | undefined;
    groupMessages?: GroupChannelMessages | undefined;
    userMessages?: UserMessages | undefined;
}
export interface ClientMessage {
    request?: Request | undefined;
    groupMessage?: GroupChannelMessage | undefined;
    authToken?: AuthenticationToken | undefined;
    currentGroup?: number | undefined;
    userMessage?: UserMessage | undefined;
}
export interface ServerMessage {
    response?: Response | undefined;
    groupChats?: GroupChats | undefined;
    groupChat?: GroupChat | undefined;
    groupMessage?: GroupChannelMessage | undefined;
    userMessage?: UserMessage | undefined;
    userChats?: UserMessages | undefined;
}
export interface UserMessage {
    id: Uint8Array;
    version: number;
    text: string;
    to: string;
    from: string;
}
export interface UserMessages {
    messages: UserMessage[];
}
export declare const VersionedMessage: MessageFns<VersionedMessage>;
export declare const AuthenticationToken: MessageFns<AuthenticationToken>;
export declare const GroupChats: MessageFns<GroupChats>;
export declare const GroupChannel: MessageFns<GroupChannel>;
export declare const GroupChat: MessageFns<GroupChat>;
export declare const GetGroupMembers: MessageFns<GetGroupMembers>;
export declare const GetGroupMessages: MessageFns<GetGroupMessages>;
export declare const AddUser: MessageFns<AddUser>;
export declare const RemoveUser: MessageFns<RemoveUser>;
export declare const GroupMember: MessageFns<GroupMember>;
export declare const GroupChannelMessage: MessageFns<GroupChannelMessage>;
export declare const GroupChannelMessages: MessageFns<GroupChannelMessages>;
export declare const GroupMembers: MessageFns<GroupMembers>;
export declare const GetUserMessages: MessageFns<GetUserMessages>;
export declare const Request: MessageFns<Request>;
export declare const Error: MessageFns<Error>;
export declare const Response: MessageFns<Response>;
export declare const ClientMessage: MessageFns<ClientMessage>;
export declare const ServerMessage: MessageFns<ServerMessage>;
export declare const UserMessage: MessageFns<UserMessage>;
export declare const UserMessages: MessageFns<UserMessages>;
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
