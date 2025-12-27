import * as libsignal from "libsignal-protocol";
export declare function resetDb(): Promise<void>;
export declare function isEqualBytes(bytes1: Uint8Array, bytes2: Uint8Array): boolean;
export declare function newJsSessionStore(): any;
export declare function newJsSessionStoreExposed(): {
    store: {
        get(key: string): Promise<any>;
        set(key: string, value: any): Promise<IDBValidKey>;
        remove(key: string): Promise<void>;
        getAll(): Promise<any[]>;
        transaction(): Promise<import("idb").IDBPTransaction<unknown, [string], "readwrite">>;
        getStoreName(): string;
    };
    sessionStore: any;
    load_session_handler: (addr: string) => Promise<any>;
    store_session_handler: (addr: string, value: Uint8Array) => Promise<IDBValidKey>;
};
export declare function newJsIdentityStore(): any;
export declare function newJsIdentityStoreExposed(): {
    store: {
        get(key: string): Promise<any>;
        set(key: string, value: any): Promise<IDBValidKey>;
        remove(key: string): Promise<void>;
        getAll(): Promise<any[]>;
        transaction(): Promise<import("idb").IDBPTransaction<unknown, [string], "readwrite">>;
        getStoreName(): string;
    };
    identityStore: any;
    is_trusted_identity_handler: (addr: string, identity: Uint8Array, _direction: libsignal.Direction) => Promise<boolean>;
    get_identity_key_handler: () => Promise<any>;
    get_local_registration_id_handler: () => Promise<any>;
    save_identity_handler: (addr: string, identity: Uint8Array) => Promise<boolean>;
    get_identity_handler: (addr: string) => Promise<any>;
};
export declare function newJsPreKeyStore(): any;
export declare function newJsPreKeyStoreExposed(): {
    store: {
        get(key: string): Promise<any>;
        set(key: string, value: any): Promise<IDBValidKey>;
        remove(key: string): Promise<void>;
        getAll(): Promise<any[]>;
        transaction(): Promise<import("idb").IDBPTransaction<unknown, [string], "readwrite">>;
        getStoreName(): string;
    };
    preKeyStore: any;
    load_pre_key_handler: (addr: string) => Promise<any>;
    store_pre_key_handler: (addr: string, record: Uint8Array) => Promise<IDBValidKey>;
    remove_pre_key_handler: (addr: string) => Promise<void>;
};
export declare function newJsSignedPreKeyStore(): any;
export declare function newJsSignedPreKeyStoreExposed(): {
    store: {
        get(key: string): Promise<any>;
        set(key: string, value: any): Promise<IDBValidKey>;
        remove(key: string): Promise<void>;
        getAll(): Promise<any[]>;
        transaction(): Promise<import("idb").IDBPTransaction<unknown, [string], "readwrite">>;
        getStoreName(): string;
    };
    signedPreKeyStore: any;
    load_signed_pre_key_handler: (addr: string) => Promise<any>;
    store_signed_pre_key_handler: (addr: string, record: Uint8Array) => Promise<IDBValidKey>;
};
export declare function newJsKyberPreKeyStore(): any;
export declare function newJsKyberPreKeyStoreExposed(): {
    store: {
        get(key: string): Promise<any>;
        set(key: string, value: any): Promise<IDBValidKey>;
        remove(key: string): Promise<void>;
        getAll(): Promise<any[]>;
        transaction(): Promise<import("idb").IDBPTransaction<unknown, [string], "readwrite">>;
        getStoreName(): string;
    };
    kyberPreKeyStore: any;
    load_kyber_pre_key_handler: (addr: string) => Promise<any>;
    store_kyber_pre_key_handler: (addr: string, record: Uint8Array) => Promise<IDBValidKey>;
    mark_kyber_pre_key_used_handler: (addr: string, preKeyId: string, publicKey: Uint8Array) => Promise<void>;
};
