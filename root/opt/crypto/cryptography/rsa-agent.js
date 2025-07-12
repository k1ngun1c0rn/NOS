const path = require("path");
const crypto = require("crypto");

class RSAAgent {
  static name = "RSA";
  static version = "0.2";
  static description = "RSA Asymmetric encryption";
  constructor() {
    this.name = RSAAgent.name;
    this.description = RSAAgent.description;

    const pubPath = "/opt/conf/public.pem";
    const privPath = "/opt/conf/private.pem";
    let publicKey, privateKey;

    // Generate RSA keypair jika belum ada
    if (!fs.existsSync(pubPath) || !fs.existsSync(privPath)) {
      const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync(
        "rsa",
        {
          modulusLength: 2048,
        },
      );

      fs.writeFileSync(pubPath, pub.export({ type: "pkcs1", format: "pem" }));
      fs.writeFileSync(privPath, priv.export({ type: "pkcs1", format: "pem" }));
      // this.crt.textOut("🔑 RSA keypair generated and saved.");
    }

    publicKey = fs.readFileSync(pubPath, "utf8");
    privateKey = fs.readFileSync(privPath, "utf8");

    this.targetPubKey = publicKey;
    this.privateKey = privateKey;
  }

  setPublicKey(pubKey) {
    this.targetPubKey = pubKey;
  }

  setPrivateKey(privKey) {
    this.privateKey = privKey;
  }

  getMyPublicKey() {
    return this.privateKey
      ? crypto
        .createPublicKey(this.privateKey)
        .export({ type: "pkcs1", format: "pem" })
      : null;
  }

  cipher(data) {
    return crypto
      .publicEncrypt(
        {
          key: this.targetPubKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        Buffer.from(data),
      )
      .toString("base64");
  }

  decipher(data) {
    return crypto
      .privateDecrypt(
        {
          key: this.privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        },
        Buffer.from(data, "base64"),
      )
      .toString();
  }
}

module.exports = RSAAgent;
