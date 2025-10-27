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
exports.FireflyWsClient = void 0;
const protos = __importStar(require("./protos/message"));
class FireflyWsClient {
    maxRetries = 3;
    waitTimeBeforeReconnectingFromLastConnection = 5 * 1000;
    connectionTimeout = 5 * 1000;
    websocketUrl;
    authToken;
    onMessageCallback;
    onRetryLimitExceeded;
    ws = undefined;
    retriesLeft = this.maxRetries;
    lastConnectionAttemptTimestamp = 0;
    disposed = false;
    constructor(websocketUrl, authToken, onMessageCallback, onRetryLimitExceeded) {
        this.websocketUrl = websocketUrl;
        this.authToken = authToken;
        this.onMessageCallback = onMessageCallback;
        this.onRetryLimitExceeded = onRetryLimitExceeded;
    }
    initialize() {
        this.retriesLeft = this.maxRetries;
        this.disposed = false;
        if (!this.isDisconnected()) {
            return;
        }
        return this.connect();
    }
    async connect() {
        await new Promise((res, _) => setTimeout(() => res(0), Math.max(0, this.waitTimeBeforeReconnectingFromLastConnection -
            (Date.now() - this.lastConnectionAttemptTimestamp))));
        console.log(`Connecting to websocket ${this.websocketUrl}`);
        const ws = new WebSocket(this.websocketUrl);
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
            this.sendData(protos.ClientMessage.encode(protos.ClientMessage.create({ bearerToken: token })).finish().buffer);
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
        this.onMessageCallback(message);
    }
    sendData(data) {
        if (this.ws) {
            this.ws.send(data);
        }
        else {
            console.warn(`websocket not initialized`);
        }
    }
    sendClientMessage(message) {
        this.sendData(protos.ClientMessage.encode(message).finish().buffer);
    }
    sendGroupMessage(message) {
        this.sendClientMessage(protos.ClientMessage.create({ groupMessage: message }));
    }
    sendUserMessage(message) {
        this.sendClientMessage(protos.ClientMessage.create({ userMessage: message }));
    }
    isDisconnected() {
        if (!this.ws) {
            return true;
        }
        const state = this.ws.readyState;
        return state == this.ws.CLOSING || state == this.ws.CLOSED;
    }
}
exports.FireflyWsClient = FireflyWsClient;
