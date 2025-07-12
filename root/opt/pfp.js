module.exports = {
  name: "getfingerprint",
  description: "Ambil fingerprint dari public key PEM",
  version: "1.0",
  needRoot: false,
  main: function (os) {
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);
    this.crt = this.shell.crt;

    const crypto = require("crypto");
    const fs = this.fd;

    function extractFingerprint(publicKeyPem, algo = "sha256") {
      if (typeof publicKeyPem !== "string") return null;
      const b64 = publicKeyPem
        .replace(/-----BEGIN PUBLIC KEY-----/, "")
        .replace(/-----END PUBLIC KEY-----/, "")
        .replace(/\s+/g, "");
      try {
        const keyBuffer = Buffer.from(b64, "base64");
        const hash = crypto.createHash(algo).update(keyBuffer).digest("hex");
        return hash.match(/.{2}/g).join(":");
      } catch (err) {
        return null;
      }
    }

    try {
      const publicKey = fs.readFileSync("/opt/conf/public.pem", "utf8");
      const fingerprint = extractFingerprint(publicKey);
      if (fingerprint) {
        this.crt.textOut(`Fingerprint: ${fingerprint}\n`);
      } else {
        this.crt.textOut("❌ Gagal mengambil fingerprint.\n");
      }
    } catch (err) {
      this.crt.textOut(`❌ Error: ${err.message}\n`);
    }

    this.shell.terminate();
  },
};