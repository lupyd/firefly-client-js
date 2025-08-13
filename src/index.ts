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

  private readonly baseUrl: string;
  private readonly authToken: () => Promise<string>;

  private readonly onMessageCallback: (message: protos.ClientMessage) => void;

  private readonly onRetryLimitExceeded: () => void;

  private ws: WebSocket | undefined = undefined;

  private requestIdCounter = 0;
  private retriesLeft = this.maxRetries;
  private lastConnectionAttemptTimestamp = 0;
  private disposed = false;

  constructor(
    baseUrl: string,
    authToken: () => Promise<string>,
    onMessageCallback: (message: protos.ClientMessage) => void,
    onRetryLimitExceeded: () => void,
  ) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    this.onMessageCallback = onMessageCallback;
    this.onRetryLimitExceeded = onRetryLimitExceeded;
  }

  initialize() {
    this.retriesLeft = this.maxRetries;
    this.disposed = false;
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

    const ws = new WebSocket(this.baseUrl + "/ws");
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

      if (this.disposed) {
        return;
      }

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

  dispose() {
    if (this.ws) {
      this.disposed = true;
      this.ws.close();
    }
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
    if (this.ws) {
      this.ws!.send(data);
    } else {
      console.warn(`websocket not initialized`);
    }
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

  async createUserChat(other: string) {
    const token = await this.authToken();
    const url = `${this.baseUrl}/user`;

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      method: "POST",
      body: other,
    });

    if (response.status != 200 && response.status != 201) {
      throw new Error(
        `unexpected statuc: ${response.status} ${await response.text()}`,
      );
    }

    const chatId = new Uint8Array(await response.arrayBuffer());

    return chatId;
  }

  async getUserChats() {
    const token = await this.authToken();
    const url = `${this.baseUrl}/users`;

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
    });

    if (response.status != 200) {
      throw new Error(
        `unexpected statuc: ${response.status} ${await response.text()}`,
      );
    }
    const msgs = protos.UserMessages.decode(
      new Uint8Array(await response.arrayBuffer()),
    );
    return msgs.messages;
  }

  async createGroupChat(chat: protos.GroupChat) {
    const token = await this.authToken();
    const url = `${this.baseUrl}/group`;

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
      method: "POST",
      body: new Uint8Array(protos.GroupChat.encode(chat).finish()),
    });

    if (response.status != 200 && response.status != 201) {
      throw new Error(
        `unexpected statuc: ${response.status} ${await response.text()}`,
      );
    }
    return protos.GroupChat.decode(
      new Uint8Array(await response.arrayBuffer()),
    );
  }

  async getGroupChats() {
    const token = await this.authToken();
    const url = `${this.baseUrl}/groups`;

    const response = await fetch(url, {
      headers: { authorization: `Bearer ${token}` },
    });

    if (response.status != 200) {
      throw new Error(
        `unexpected statuc: ${response.status} ${await response.text()}`,
      );
    }
    const chats = protos.GroupChats.decode(
      new Uint8Array(await response.arrayBuffer()),
    );
    return chats.chats;
  }
}
