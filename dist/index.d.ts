import * as protos from "./protos/message";
export * as protos from "./protos/message";
export declare class FireflyClient {
    private readonly maxRetries;
    private readonly waitTimeBeforeReconnectingFromLastConnection;
    private readonly connectionTimeout;
    private readonly responseTimeout;
    private readonly pendingRequests;
    private readonly url;
    private readonly authToken;
    private readonly onMessageCallback;
    private readonly onRetryLimitExceeded;
    private ws;
    private requestIdCounter;
    private retriesLeft;
    private lastConnectionAttemptTimestamp;
    constructor(url: string, authToken: () => Promise<string>, onMessageCallback: (message: protos.ClientMessage) => void, onRetryLimitExceeded: () => void);
    initialize(): Promise<void>;
    private connect;
    private onMessage;
    private sendData;
    sendMessage(message: protos.GroupChannelMessage): void;
    private getNewRequestId;
    sendRequest(request: protos.Request): Promise<protos.Response>;
}
