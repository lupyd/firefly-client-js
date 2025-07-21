import * as protos from "./protos/message";
export * as protos from "./protos/message";

export class FireflyClient {
  private readonly maxRetries = 3;
  private readonly waitTimeBeforeReconnectingFromLastConnection = 5 * 1000;

  private readonly connectionTimeout = 5 * 1000;
  private readonly responseTimeout = 5 * 1000;
  private readonly pendingRequests = new Map<
    number,
    (response: protos.Response) => void
  >();

  private readonly url: string;
  private readonly authToken: () => Promise<string>;

  private readonly onMessageCallback: (message: protos.ClientMessage) => void;

  private readonly onRetryLimitExceeded: () => void;

  private ws: WebSocket;

  private requestIdCounter = 0;
  private retriesLeft = this.maxRetries;
  private lastConnectionAttemptTimestamp = 0;

  constructor(
    url: string,
    authToken: () => Promise<string>,
    onMessageCallback: (message: protos.ClientMessage) => void,
    onRetryLimitExceeded: () => void,
  ) {
    this.url = url;
    this.authToken = authToken;
    this.onMessageCallback = onMessageCallback;
    this.onRetryLimitExceeded = onRetryLimitExceeded;
  }

  initialize() {
    this.retriesLeft = this.maxRetries;
    return this.connect();
  }

  private async connect() {
    await new Promise((res, _) =>
      setTimeout(
        () => res(0),
        Math.min(
          this.waitTimeBeforeReconnectingFromLastConnection,
          Date.now() -
            this.lastConnectionAttemptTimestamp -
            this.waitTimeBeforeReconnectingFromLastConnection,
        ),
      ),
    );

    const ws = new WebSocket(this.url);
    this.lastConnectionAttemptTimestamp = Date.now();
    this.ws = ws;

    setTimeout(() => {
      if (ws.readyState !== ws.OPEN) {
        ws.close();
      }
    }, this.connectionTimeout);

    ws.binaryType = "arraybuffer";
    ws.addEventListener("message", (ev) => {
      if (ev.data instanceof ArrayBuffer) {
        this.onMessage(ev.data);
      } else {
        console.warn(`Unhandled data format`, ev.data);
      }
    });

    ws.addEventListener("error", (error) => {
      console.error(error);
    });

    ws.addEventListener("close", (ev) => {
      console.log(`Websocket closed with code: ${ev.code}`);

      if (this.retriesLeft > 0) {
        this.connect();
        this.retriesLeft--;
      } else {
        this.onRetryLimitExceeded();
      }
    });

    ws.addEventListener("open", async () => {
      console.log(`Connection opened`);
      this.retriesLeft = this.maxRetries;

      const token = await this.authToken();
      this.sendData(
        protos.ClientMessage.encode(
          protos.ClientMessage.create({ authToken: { token } }),
        ).finish().buffer,
      );
    });
  }

  private onMessage(data: ArrayBuffer) {
    const message = protos.ServerMessage.decode(new Uint8Array(data));

    if (message.response) {
      const cb = this.pendingRequests.get(message.response.id);
      if (cb) {
        cb(message.response!);
        this.pendingRequests.delete(message.response.id);
      }
    } else {
      this.onMessageCallback(message);
    }
  }

  private sendData(data: ArrayBufferLike) {
    this.ws.send(data);
  }

  sendMessage(message: protos.GroupChannelMessage) {
    this.sendData(
      protos.ClientMessage.encode(
        protos.ClientMessage.create({ groupMessage: message }),
      ).finish().buffer,
    );
  }

  private getNewRequestId() {
    this.requestIdCounter++;
    return this.requestIdCounter;
  }
  sendRequest(request: protos.Request): Promise<protos.Response> {
    return new Promise((resolve, reject) => {
      request.id = this.getNewRequestId();
      this.pendingRequests.set(request.id, resolve);

      this.sendData(
        protos.ClientMessage.encode(
          protos.ClientMessage.create({ request }),
        ).finish().buffer,
      );

      setTimeout(() => {
        const cb = this.pendingRequests.get(request.id);
        if (cb) {
          reject(
            Error(
              `Didn't receive response in the time ${this.responseTimeout}ms`,
            ),
          );
          this.pendingRequests.delete(request.id);
        }
      }, this.responseTimeout);
    });
  }
}
