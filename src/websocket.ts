import * as protos from "./protos/message";

export class FireflyWsClient extends EventTarget {
  private maxRetries = 3;
  private waitTimeBeforeReconnectingFromLastConnection = 5 * 1000;

  private connectionTimeout = 5 * 1000;
  private readonly websocketUrl: string;
  authToken: () => Promise<string>;

  private ws: WebSocket | undefined = undefined;

  private retriesLeft = this.maxRetries;
  private lastConnectionAttemptTimestamp = 0;
  private disposed = false;

  constructor(
    websocketUrl: string,
    authToken: () => Promise<string>,
    maxRetries = 3,
    waitTimeBeforeReconnectingFromLastConnectionInMs = 5 * 1000,
    connectionTimeoutInMs = 5 * 1000,
  ) {
    super();
    this.websocketUrl = websocketUrl;
    this.authToken = authToken;
    this.connectionTimeout = connectionTimeoutInMs;
    this.maxRetries = maxRetries;
    this.waitTimeBeforeReconnectingFromLastConnection =
      waitTimeBeforeReconnectingFromLastConnectionInMs;
  }

  async initialize() {
    this.retriesLeft = this.maxRetries;
    this.disposed = false;

    if (!this.isDisconnected()) {
      return;
    }

    return await this.connect();
  }

  private async connect() {
    await new Promise((res, _) =>
      setTimeout(
        () => res(0),
        Math.max(
          0,
          this.waitTimeBeforeReconnectingFromLastConnection -
            (Date.now() - this.lastConnectionAttemptTimestamp),
        ),
      ),
    );

    const url = new URL(this.websocketUrl);
    url.searchParams.set("authToken", await this.authToken());

    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";
    this.lastConnectionAttemptTimestamp = Date.now();
    this.ws = ws;

    setTimeout(() => {
      if (ws.readyState !== ws.OPEN) {
        ws.close();
      }
    }, this.connectionTimeout);

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
      this.ws = undefined;
      this.dispatchEvent(new CustomEvent("onDisconnect", { detail: ev.code }));

      if (this.disposed) {
        return;
      }

      if (this.retriesLeft > 0) {
        this.connect();
        this.retriesLeft--;
      } else {
        this.dispatchEvent(new CustomEvent("onRetryLimitExceeded"));
      }
    });

    ws.addEventListener("open", async () => {
      console.log(`Connection opened`);
      this.retriesLeft = this.maxRetries;
      this.dispatchEvent(new CustomEvent("onConnect"));

      // const token = await this.authToken();
      // this.sendClientMessage(
      //   protos.ClientMessage.create({ bearerToken: token }),
      // );
    });
  }

  dispose() {
    if (this.ws) {
      this.disposed = true;
      this.ws.close();
    }
  }

  private onMessage(data: ArrayBuffer) {
    const message = protos.ServerMessage.decode(new Uint8Array(data));

    if (message.response) {
      const resolve = this.pendingRequests.get(message.response.id);
      if (resolve) {
        resolve(message.response);
      }

      return;
    }

    this.dispatchEvent(new CustomEvent("onMessage", { detail: message }));
  }

  private sendData(data: ArrayBufferLike) {
    if (this.ws) {
      this.ws!.send(data);
    } else {
      console.warn(`websocket not initialized`);
    }
  }

  sendClientMessage(message: protos.ClientMessage) {
    this.sendData(protos.ClientMessage.encode(message).finish().buffer);
  }

  private readonly pendingRequests = new Map<
    number,
    (response: protos.Response) => void
  >();

  sendRequest(request: protos.Request, responseTimeout: number) {
    const newId = this.newRequestId();
    request.id = newId;
    this.sendClientMessage(
      protos.ClientMessage.create({
        request,
      }),
    );

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(newId, resolve);

      if (responseTimeout > 0) {
        setTimeout(() => {
          if (this.pendingRequests.has(newId)) {
            reject("response timed out");
            this.pendingRequests.delete(newId);
          }
        }, responseTimeout);
      }
    });
  }

  newRequestId() {
    const newId = Math.floor(Math.random() * 2 ** 16);
    if (this.pendingRequests.has(newId)) {
      return this.newRequestId();
    }
    return newId;
  }

  // sendGroupMessage(message: protos.GroupMessage) {
  //   this.sendClientMessage(
  //     protos.ClientMessage.create({ groupMessage: message }),
  //   );
  // }

  // sendUserMessage(message: protos.UserMessage) {
  //   this.sendClientMessage(
  //     protos.ClientMessage.create({ userMessage: message }),
  //   );
  // }

  isDisconnected() {
    if (!this.ws) {
      return true;
    }
    const state = this.ws.readyState;
    return state == this.ws.CLOSING || state == this.ws.CLOSED;
  }
}
