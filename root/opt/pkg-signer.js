module.exports = {
  name: "pkg-signer",
  version: "1.0",
  needRoot: true,
  description: "Menandatangani file packages.json dengan RSA",
  main: function (nos) {
    const crypto = require("crypto");
    const path = require("path");

    this.shell.loadDevices([{ name: "bfsAccess", objectName: "fa" }], this);

    const args = this.shell.lastCmd.trim().split(/\s+/);
    if (args.includes('--help') || args.includes('-h')) {
      this.crt.textOut(
        'Menandatangani file packages.json dengan RSA\n' +
        'Usage: pkg-signer [input_file.json] [output_file.signed]\n' +
        'Jika argumen tidak diisi:\n' +
        '  input_file.json   default: /opt/conf/packages.json\n' +
        '  output_file.signed default: /opt/conf/packages.signed.json\n' +
        'Contoh:\n' +
        '  pkg-signer\n' +
        '  pkg-signer /opt/conf/packages.json\n' +
        '  pkg-signer /opt/conf/packages.json /opt/conf/custom.signed.json\n'
      );
      this.shell.terminate();
      return;
    }

    let inputFile = args[1];
    let outputFile = args[2];

    if (!inputFile) {
      inputFile = "/opt/conf/packages.json";
    }
    if (!outputFile) {
      outputFile = "/opt/conf/packages.signed.json";
    }

    const hasPriv = this.fa.existsSync("/opt/conf/private.pem");
    const hasPub = this.fa.existsSync("/opt/conf/public.pem");
    if (!hasPriv || !hasPub) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
      });
      this.fa.writeFileSync(
        "/opt/conf/private.pem",
        privateKey.export({ type: "pkcs1", format: "pem" })
      );
      this.fa.writeFileSync(
        "/opt/conf/public.pem",
        publicKey.export({ type: "pkcs1", format: "pem" })
      );
    }

    const privateKey = this.fa.readFileSync("/opt/conf/private.pem", "utf8");
    const publicKey = this.fa.readFileSync("/opt/conf/public.pem", "utf8");

    let raw;
    try {
      raw = this.fa.readFileSync(inputFile, "utf8");
    } catch (err) {
      this.crt.textOut("❌ Gagal membaca file: " + err.message);
      this.shell.terminate();
      return;
    }

    let pkgData;
    try {
      pkgData = JSON.parse(raw).packages;
    } catch (err) {
      this.crt.textOut("❌ Format JSON tidak valid: " + err.message);
      this.shell.terminate();
      return;
    }

    for (const pkg of pkgData) {
      if (Array.isArray(pkg.items)) {
        for (const item of pkg.items) {
          try {
            const content = this.fa.readFileSync(
              "/" + item.src.replace(/^\/+/, "")
            );
            const hash = crypto.createHash("sha256").update(content).digest();
            item.signature = crypto
              .sign("sha256", hash, privateKey)
              .toString("base64");
          } catch (err) {
            this.crt.textOut(
              `⚠️  Tidak bisa baca file: ${item.src} (${err.message})`
            );
            item.hash = null;
          }
        }
      }
    }

    const serialized = JSON.stringify(pkgData);
    const hash = crypto.createHash("sha256").update(serialized).digest();
    const signature = crypto
      .sign("sha256", hash, privateKey)
      .toString("base64");

    const signed = {
      packages: pkgData,
      signature: signature,
      publicKey: publicKey,
    };

    try {
      this.fa.writeFileSync(outputFile, JSON.stringify(signed, null, 2));
      this.crt.textOut(
        `✅ File berhasil ditandatangani dan disimpan ke ${outputFile}`
      );
    } catch (err) {
      this.crt.textOut("❌ Gagal menulis file output: " + err.message);
    }

    this.shell.terminate();
  },
};
