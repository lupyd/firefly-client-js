import * as protos from "./protos/message";
export * as protos from "./protos/message";
export declare class FireflyClient {
    readonly url: string;
    readonly authToken: () => Promise<string>;
    private ws;
    private pendingRequests;
    private requestIdCounter;
    private readonly maxRetries;
    private retriesLeft;
    private waitTimeBeforeReconnectingFromLastConnection;
    private connectionTimeout;
    private onMessageCallback;
    private lastConnectionAttemptTimestamp;
    constructor(url: string, authToken: () => Promise<string>, onMessageCallback: (message: protos.ClientMessage) => void);
    initialize(): void;
    private connect;
    private onMessage;
    sendData(data: ArrayBufferLike): void;
    sendMessage(message: protos.GroupChannelMessage): void;
    private getNewRequestId;
    sendRequest(request: protos.Request): Promise<protos.Response>;
}
