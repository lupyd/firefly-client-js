import * as protos from "./protos/message";
export declare class FireflyWsClient extends EventTarget {
    private maxRetries;
    private waitTimeBeforeReconnectingFromLastConnection;
    private connectionTimeout;
    private readonly websocketUrl;
    authToken: () => Promise<string>;
    private ws;
    private retriesLeft;
    private lastConnectionAttemptTimestamp;
    private disposed;
    constructor(websocketUrl: string, authToken: () => Promise<string>, maxRetries?: number, waitTimeBeforeReconnectingFromLastConnectionInMs?: number, connectionTimeoutInMs?: number);
    initialize(): Promise<void>;
    private connect;
    dispose(): void;
    private onMessage;
    private sendData;
    sendClientMessage(message: protos.ClientMessage): void;
    private readonly pendingRequests;
    sendRequest(request: protos.Request, responseTimeout: number): Promise<unknown>;
    newRequestId(): any;
    isDisconnected(): boolean;
}
