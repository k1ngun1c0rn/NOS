
const crypto = require("crypto");

class ChaCha20Poly1305Agent {
  static name = "chacha20-poly1305";
  static description = "ChaCha20-Poly1305";
  constructor(key) {
    this.name = ChaCha20Poly1305Agent.name;
    this.description = ChaCha20Poly1305Agent.description;
    this.setKey(key);
  }

  setKey(key) {
    // this.key = key;
    this.key = Buffer.isBuffer(key) ? key : Buffer.from(key);
    // console.log(`key: ${this.key.toString("hex")}`)
    // this.key = crypto.createHash("sha256").update(key + ":" + (new Date().getTime()) + ":" + Math.random()).digest();

  }
  cipher(data) {
    // console.log("gggg"+data+"|"+this.key.toString("hex"))
    if (data && this.key != "") {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("chacha20-poly1305", this.key, iv, {
        authTagLength: 16
      });
      const encrypted = Buffer.concat([
        cipher.update(Buffer.from(data, "utf8")),
        cipher.final()
      ]);
      const tag = cipher.getAuthTag();
      const final = Buffer.concat([iv, tag, encrypted]).toString("hex");
      return final;
    } else return data;
  }

  decipher(data) {
    if (data && this.key != "") {
      try {
        if (data) {
          const buffer = Buffer.from(data, "hex");
          const nonce = buffer.subarray(0, 12);
          const tag = buffer.subarray(12, 28);
          const ciphertext = buffer.subarray(28);
          const decipher = crypto.createDecipheriv("chacha20-poly1305", this.key, nonce, {
            authTagLength: 16
          });
          decipher.setAuthTag(tag);
          const decrypted = Buffer.concat([
            decipher.update(ciphertext),
            decipher.final()
          ]);
          return decrypted.toString("utf8");
        } else return data;
      } catch (err) {
        // console.error("❌ Authentication failed during decryption:", err.message);
        // console.error(`Data: ${data}`);
        return data;
      }
    } else {
      return data
    }
  }
}

module.exports = ChaCha20Poly1305Agent;
