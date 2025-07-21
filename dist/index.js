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
    url;
    authToken;
    ws;
    pendingRequests = new Map();
    requestIdCounter = 0;
    maxRetries = 3;
    retriesLeft = this.maxRetries;
    waitTimeBeforeReconnectingFromLastConnection = 5 * 1000;
    connectionTimeout = 5 * 1000;
    onMessageCallback;
    lastConnectionAttemptTimestamp = 0;
    constructor(url, authToken, onMessageCallback) {
        this.url = url;
        this.authToken = authToken;
        this.onMessageCallback = onMessageCallback;
    }
    initialize() {
        this.connect();
    }
    async connect() {
        await new Promise((res, _) => setTimeout(() => res(0), Math.min(this.waitTimeBeforeReconnectingFromLastConnection, Date.now() -
            this.lastConnectionAttemptTimestamp -
            this.waitTimeBeforeReconnectingFromLastConnection)));
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
            if (this.retriesLeft > 0) {
                setTimeout(() => this.connect());
                this.retriesLeft--;
            }
        });
        ws.addEventListener("open", async () => {
            console.log(`Connection opened`);
            this.retriesLeft = this.maxRetries;
            const token = await this.authToken();
            this.sendData(protos.ClientMessage.encode(protos.ClientMessage.create({ authToken: { token } })).finish().buffer);
        });
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
        this.ws.send(data);
    }
    sendMessage(message) {
        this.sendData(protos.ClientMessage.encode(protos.ClientMessage.create({ groupMessage: message })).finish().buffer);
    }
    getNewRequestId() {
        this.requestIdCounter++;
        return this.requestIdCounter;
    }
    sendRequest(request) {
        return new Promise((resolve, _reject) => {
            request.id = this.getNewRequestId();
            this.pendingRequests.set(request.id, (response) => resolve(response));
            this.sendData(protos.ClientMessage.encode(protos.ClientMessage.create({ request })).finish().buffer);
        });
    }
}
exports.FireflyClient = FireflyClient;
