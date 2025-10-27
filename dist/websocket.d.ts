import * as protos from "./protos/message";
export declare class FireflyWsClient extends EventTarget {
    private readonly maxRetries;
    private readonly waitTimeBeforeReconnectingFromLastConnection;
    private readonly connectionTimeout;
    private readonly websocketUrl;
    private readonly authToken;
    private ws;
    private retriesLeft;
    private lastConnectionAttemptTimestamp;
    private disposed;
    constructor(websocketUrl: string, authToken: () => Promise<string>);
    initialize(): Promise<void>;
    private connect;
    dispose(): void;
    private onMessage;
    private sendData;
    sendClientMessage(message: protos.ClientMessage): void;
    sendGroupMessage(message: protos.GroupMessage): void;
    sendUserMessage(message: protos.UserMessage): void;
    isDisconnected(): boolean;
}
