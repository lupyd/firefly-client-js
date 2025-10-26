import * as libsignal from "libsignal-protocol";
export declare function resetDb(): Promise<void>;
export declare function isEqualBytes(bytes1: Uint8Array, bytes2: Uint8Array): boolean;
export declare function newJsSessionStore(): libsignal.JsSessionStore;
export declare function newJsIdentityStore(): libsignal.JsIdentityKeyStore;
export declare function newJsPreKeyStore(): libsignal.JsPreKeyStore;
export declare function newJsSignedPreKeyStore(): libsignal.JsSignedPreKeyStore;
export declare function newJsKyberPreKeyStore(): libsignal.JsKyberPreKeyStore;
export * as libsignal from "libsignal-protocol";
