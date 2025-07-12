const crypto = require("crypto");

function signContent(content, privateKeyPem) {
  const sign = crypto.createSign("sha256");
  sign.update(content);
  sign.end();

  const signature = sign.sign(privateKeyPem, "base64");

  // Ekstrak public key dari privateKeyPem
  const privateKeyObj = crypto.createPrivateKey(privateKeyPem);
  const publicKeyPem = privateKeyObj.export({ type: "pkcs1", format: "pem" });
  // const publicKeyPem = privateKeyObj.export({ type: "spki", format: "pem" });

  return {
    publicKey: publicKeyPem,
    signature: signature
  };
}

/**
 * Verifikasi signature dan publicKey terhadap sebuah content string
 * @param {string} content - Data asli yang diverifikasi
 * @param {string} publicKeyPem - Public key (PEM string)
 * @param {string} signature - Signature dalam base64
 * @returns {boolean}
 */

function verifySignature(content, publicKeyPem, signature) {
  try {
    const verify = crypto.createVerify("sha256");
    verify.update(content);
    verify.end();
    return verify.verify(publicKeyPem, signature, "base64");
  } catch (e) {
    return false;
  }
}

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

function isPackageSafe(package, blacklist) {
  if (!Array.isArray(package)) return false;
  for (const item of package) {
    const dst = item.dst;
    if (!dst || typeof dst !== "string") continue;

    for (const banned of blacklist) {
      // Pastikan banned path match secara exact atau sebagai prefix,
      // tapi jangan biarkan "/" match semua.
      if (
        dst === banned ||
        (banned !== "/" && dst.startsWith(banned + "/"))
      ) {
        return false;
      }
    }
  }

  return true;
}

function checkGlobalSignature(parsed) {
  try {
    const dataToVerify = JSON.stringify(parsed.packages);
    // console.log(`dataToVerify ${dataToVerify}`);
    const hash = crypto.createHash('sha256').update(dataToVerify).digest();
    const isSignatureValid = crypto.verify("sha256", hash, parsed.publicKey, Buffer.from(parsed.signature, 'base64'));
    return isSignatureValid;
  } catch (e) {
    console.error(e);
  }

  // if (isSignatureValid) {
  //   console.log("✅ Signature global valid.");
  // } else {
  //   console.error("❌ Signature global TIDAK VALID! File mungkin telah dimodifikasi.");
  // })
}

function checkSignatures(parsed, fa) {
  // Verifikasi hash tiap item
  let errorCount = 0;
  for (const pkg of parsed.packages) {
    pkg.isPackageSafe = true;
    pkg.valid = true;
    if (Array.isArray(pkg.items)) {
      let isSafe = isPackageSafe(pkg.items, ["/", "/base", "/lib"]);
      if (!isSafe) pkg.isPackageSafe = false;

      for (const item of pkg.items) {
        if (!item.src || !item.signature) {
          console.warn(`⚠️  Item tidak lengkap:`, item);
          continue;
        }
        try {
          const content = fa.readFileSync(item.src);
          const dataToVerify = content;
          const hash = crypto.createHash('sha256').update(dataToVerify).digest();
          const isSignatureValid = crypto.verify("sha256", hash, parsed.publicKey, Buffer.from(item.signature, 'base64'));

          if (isSignatureValid) {
            item.status = "Valid";
            // console.log("**");
          } else {
            // console.log("!!");
            pkg.valid = false;
            item.status = "Invalid";
            errorCount++;
          }
        } catch (err) {
          console.log(err);
          errorCount++;
        }
      }
    }
    if (pkg.valid === true) pkg.status = "✅ Valid"; else pkg.status = "❌ Invalid";
  }
  return parsed;
}

module.exports = { signContent, verifySignature, extractFingerprint, isPackageSafe, checkGlobalSignature, checkSignatures }