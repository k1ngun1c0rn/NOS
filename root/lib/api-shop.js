// ============================================
// NOSPacketFlow.js (renamed: chaSharekey)
// Refactored: centralized handler logic
// ============================================

const NOSPacketStackV2 = bfs.require("/lib/NOSPacketStackV2");
const crypto = require("crypto");

class chaSharekey extends NOSPacketStackV2 {
  constructor(connection) {
    super(connection);

    this._sharedKeyHandler = null;
    this._decryptedHandler = null;

    this.setHandler((payload, src) => {
      if (typeof payload === "string") {
        if (payload === "__request::key-exchange") {
          return this._sharedKeyHandler?.("request", src);
        } else if (payload.startsWith("__pubkey::")) {
          return this._sharedKeyHandler?.("pubkey", src, payload);
        } else if (payload.startsWith("__secretkey::")) {
          return this._sharedKeyHandler?.("secretkey", src, payload);
        } else if (payload === "__status::done") {
          return this._sharedKeyHandler?.("done", src);
        }
      }

      if (typeof this._decryptedHandler === "function") {
        this._decryptedHandler(payload, src);
      }
    });
  }

  negotiateKeyExchangeAsServer(rsaKeyPair, onGotSharedKey = null) {
    this._sharedKeyHandler = (type, src, payload) => {
      if (type === "request") {
        // this.getSession(src).established = false;
        // console.log(`[Master] kirim publickey ke ${JSON.stringify(src)}`);
        this.send(src, `__pubkey::${rsaKeyPair.publicKey}`);
      } else if (type === "secretkey") {
        const encrypted = payload.split("::")[1];
        const sharedKey = crypto.privateDecrypt(
          {
            key: rsaKeyPair.privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          },
          Buffer.from(encrypted, "hex"),
        );
        this.send(src, `__status::done`);
        // this.getSession(src).established = true;
        if (onGotSharedKey) onGotSharedKey("" + sharedKey.toString("hex"), src);
      }
    };
  }

  negotiateKeyExchangeAsClient(dst, makeSharedKeyFn, onFinish) {
    const sharedKey = makeSharedKeyFn();
    let waiting = true;

    this._sharedKeyHandler = (type, src, payload) => {
      if (!waiting) return;
      if (type === "pubkey") {
        const pub = payload.split("::")[1];
        const encrypted = crypto
          // .publicEncrypt(pub, Buffer.from(sharedKey, "hex"))
          .publicEncrypt(
            {
              key: pub,
              padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            },
            Buffer.from(sharedKey, "hex"),
          )
          .toString("hex");
        this.send(dst, `__secretkey::${encrypted}`);
      } else if (type === "done") {
        this.getSession(src).established = true;
        waiting = false;
        if (typeof onFinish === "function") onFinish(sharedKey, dst);
      }
    };

    this.send(dst, "__request::key-exchange");
  }

  onDecryptedMessage(callback) {
    this._decryptedHandler = callback;
  }
}

// =====================
// NOSChannel: Wrapper sederhana untuk chaSharekey
// =====================
class NOSChannel extends chaSharekey {
  constructor(connection) {
    super(connection);
    this._eventHandlers = {};
    this._connected = false;
    this._sharedKey = null;
    this._peer = null;
  }

  // Untuk server: tunggu key exchange dari client
  async accept(rsaKeyPair) {
    return new Promise((resolve) => {
      this.negotiateKeyExchangeAsServer(rsaKeyPair, (sharedKey, src) => {
        this._connected = true;
        this._sharedKey = sharedKey;
        this._peer = src;
        if (this._eventHandlers["connect"])
          this._eventHandlers["connect"](src, sharedKey);
        resolve({ src, sharedKey });
      });
    });
  }

  // Untuk client: lakukan key exchange ke server
  async connect(dst, makeSharedKeyFn) {
    return new Promise((resolve) => {
      this.negotiateKeyExchangeAsClient(
        dst,
        makeSharedKeyFn,
        (sharedKey, dstAddr) => {
          this._connected = true;
          this._sharedKey = sharedKey;
          this._peer = dstAddr;
          if (this._eventHandlers["connect"])
            this._eventHandlers["connect"](dstAddr, sharedKey);
          resolve({ dst: dstAddr, sharedKey });
        },
      );
    });
  }

  // Kirim pesan terenkripsi
  sendMessage(target, data) {
    this.send(target, data);
  }

  // Handler event: connect, message, error, etc
  on(event, handler) {
    this._eventHandlers[event] = handler;
    if (event === "message") {
      this.onDecryptedMessage((payload, src) => {
        handler(payload, src);
      });
    }
  }

  // Tutup channel (optional)
  close() {
    // Implementasi sesuai kebutuhan
  }
}

module.exports = { chaSharekey, NOSChannel };
