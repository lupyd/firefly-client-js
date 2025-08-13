"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FireflyClient = exports.protos = void 0;
const protos = __importStar(require("./protos/message"));
exports.protos = __importStar(require("./protos/message"));
class FireflyClient {
    maxRetries = 3;
    waitTimeBeforeReconnectingFromLastConnection = 5 * 1000;
    connectionTimeout = 5 * 1000;
    responseTimeout = 5 * 1000;
    pendingRequests = new Map();
    baseUrl;
    authToken;
    onMessageCallback;
    onRetryLimitExceeded;
    ws = undefined;
    requestIdCounter = 0;
    retriesLeft = this.maxRetries;
    lastConnectionAttemptTimestamp = 0;
    disposed = false;
    constructor(baseUrl, authToken, onMessageCallback, onRetryLimitExceeded) {
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
    async connect() {
        await new Promise((res, _) => setTimeout(() => res(0), Math.min(this.waitTimeBeforeReconnectingFromLastConnection, Date.now() -
            this.lastConnectionAttemptTimestamp -
            this.waitTimeBeforeReconnectingFromLastConnection)));
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
            }
            else {
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
            }
            else {
                this.onRetryLimitExceeded();
            }
        });
        ws.addEventListener("open", async () => {
            console.log(`Connection opened`);
            this.retriesLeft = this.maxRetries;
            const token = await this.authToken();
            this.sendData(protos.ClientMessage.encode(protos.ClientMessage.create({ authToken: { token } })).finish().buffer);
        });
    }
    dispose() {
        if (this.ws) {
            this.disposed = true;
            this.ws.close();
        }
    }
    onMessage(data) {
        const message = protos.ServerMessage.decode(new Uint8Array(data));
        if (message.response) {
            const cb = this.pendingRequests.get(message.response.id);
            if (cb) {
                cb(message.response);
                this.pendingRequests.delete(message.response.id);
            }
        }
        else {
            this.onMessageCallback(message);
        }
    }
    sendData(data) {
        if (this.ws) {
            this.ws.send(data);
        }
        else {
            console.warn(`websocket not initialized`);
        }
    }
    sendMessage(message) {
        this.sendData(protos.ClientMessage.encode(protos.ClientMessage.create({ groupMessage: message })).finish().buffer);
    }
    getNewRequestId() {
        this.requestIdCounter++;
        return this.requestIdCounter;
    }
    sendRequest(request) {
        return new Promise((resolve, reject) => {
            request.id = this.getNewRequestId();
            this.pendingRequests.set(request.id, resolve);
            this.sendData(protos.ClientMessage.encode(protos.ClientMessage.create({ request })).finish().buffer);
            setTimeout(() => {
                const cb = this.pendingRequests.get(request.id);
                if (cb) {
                    reject(Error(`Didn't receive response in the time ${this.responseTimeout}ms`));
                    this.pendingRequests.delete(request.id);
                }
            }, this.responseTimeout);
        });
    }
    async createUserChat(other) {
        const token = await this.authToken();
        const url = `${this.baseUrl}/user`;
        const response = await fetch(url, {
            headers: { authorization: `Bearer ${token}` },
            method: "POST",
            body: other,
        });
        if (response.status != 200 && response.status != 201) {
            throw new Error(`unexpected statuc: ${response.status} ${await response.text()}`);
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
            throw new Error(`unexpected statuc: ${response.status} ${await response.text()}`);
        }
        const msgs = protos.UserMessages.decode(new Uint8Array(await response.arrayBuffer()));
        return msgs.messages;
    }
    async createGroupChat(chat) {
        const token = await this.authToken();
        const url = `${this.baseUrl}/group`;
        const response = await fetch(url, {
            headers: { authorization: `Bearer ${token}` },
            method: "POST",
            body: new Uint8Array(protos.GroupChat.encode(chat).finish()),
        });
        if (response.status != 200 && response.status != 201) {
            throw new Error(`unexpected statuc: ${response.status} ${await response.text()}`);
        }
        return protos.GroupChat.decode(new Uint8Array(await response.arrayBuffer()));
    }
    async getGroupChats() {
        const token = await this.authToken();
        const url = `${this.baseUrl}/groups`;
        const response = await fetch(url, {
            headers: { authorization: `Bearer ${token}` },
        });
        if (response.status != 200) {
            throw new Error(`unexpected statuc: ${response.status} ${await response.text()}`);
        }
        const chats = protos.GroupChats.decode(new Uint8Array(await response.arrayBuffer()));
        return chats.chats;
    }
}
exports.FireflyClient = FireflyClient;
