const crypto = require("crypto");

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


const publicKey = fs.readFileSync("public.pem", "utf8");
console.log(extractFingerprint(publicKey));