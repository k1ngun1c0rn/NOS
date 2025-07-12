
// ============================================
// pkgd.js - NOS Package Manager Server
// ============================================

const path = require("path");
const zlib = require("zlib");

module.exports = {
  name: "pkgd",
  version: "0.55",
  needRoot: true,
  main: function (nos) {
    const flags = bfs.require(`/lib/packetFlags.js`);
    const chaSharekey =
      bfs.require(`/lib/api-shop.js`).chaSharekey;
    this.shell.loadDevices(
      [
        { name: __APP.defaultComm, objectName: "mqtnl" },
        { name: "bfsAccess", objectName: "fa" },
      ],
      this
    );

    let port = 406; // Default port
    let ttlExpiredSeconds = 60 * 5; // Default port

    const args = this.shell.parseCommand(this.shell.lastCmd);
    if (args.params && args.params.p) {
      port = parseInt(args.params.p);
    }
    if (args.params && args.params.t) {
      ttlExpiredSeconds = parseInt(args.params.t);
    }

    // Load RSA keypair
    const privateKey = this.fa.readFileSync(`/opt/conf/private.pem`, true, "utf8");
    const publicKey = this.fa.readFileSync(`/opt/conf/public.pem`, true, "utf8");
    const rsaKeyPair = { publicKey, privateKey };

    const conn = new this.mqtnl.mqtnlConnection(this.mqtnl.connMgr, port);
    let stack = new chaSharekey(conn);
    stack.negotiateKeyExchangeAsServer(rsaKeyPair, (sharedKey, src) => {
      const session = stack.getSession(src);
      let secretKey = Buffer.from(sharedKey, "hex");

      session.cha = nos.__CORE.encryption.addInstance(
        `pkgd${session.id}`,
        "chacha20-poly1305",
        nos.sysConfig.chacha20poly.key
      );
      session.cha.setKey(secretKey);
      stack.setTTLFor(src, ttlExpiredSeconds * 1000);
      stack.setAgentFor(src, session.cha);
      // this.crt.textOut(
      //   `✅ Secure session ready for ${src.address}:${src.port}`
      // );

      stack.onDecryptedMessage(async (payload, client) => {
        if (!payload) return;

        try {
          const data = JSON.parse(payload);

          if (data.type === "list") {
            const checksig = bfs.require("/lib/pkglib");
            const packagesPath = "/opt/conf/packages.signed.json";

            let packagesStr = fs.readFileSync(packagesPath, true, "utf8");
            let packagesSigChecked;
            packages = JSON.parse(packagesStr);
            packagesSigChecked = JSON.parse(packagesStr);
            try {
              packagesSigChecked = checksig.checkSignatures(
                packagesSigChecked,
                this.fa
              ).packages;
              // console.log(JSON.stringify(packages))
            } catch (e) {
              console.log(e);
            }
            packagesSigChecked = packagesSigChecked.filter(
              (pkg) => pkg.active !== false
            );
            // conn.reply(JSON.stringify(packages), sender);

            const reply = {
              type: "list-reply",
              packageSignatureStatus: checksig.checkGlobalSignature(packages),
              fingerPrintRepository: checksig.extractFingerprint(
                packages.publicKey
              ),
              packages: packagesSigChecked.map((pkg) => ({
                name: pkg.name,
                description: pkg.description || "",
                version: pkg.version || "",
                author: pkg.author || "",
                status: pkg.status || "",
                isPackageSafe: pkg.isPackageSafe,
              })),
            };

            stack.send(client, JSON.stringify(reply));
          } else if (data.type === "getinfo" && data.package) {
            const packagesPath = "/opt/conf/packages.signed.json";
            const packagesJson = JSON.parse(
              this.fa.readFileSync(packagesPath, true, "utf8")
            );
            const pkg = (packagesJson.packages || []).find(
              (p) => p.name === data.package
            );

            if (!pkg) {
              // this.crt.textOut(`⚠️ Package '${data.package}' tidak ditemukan`);
              const packetInfo = { type: "packageInfo", data: "Package not found!" };
              await stack.send(client, JSON.stringify(packetInfo));
              return;
            }

            const packetInfo = { type: "packageInfo", data: pkg };
            await stack.send(client, JSON.stringify(packetInfo));
            // this.crt.textOut(`✅ Finished sending package '${pkg.name}'`);
          } else if (data.type === "get" && data.package) {// install procedure
            const packagesPath = "/opt/conf/packages.signed.json";
            const packagesJson = JSON.parse(
              this.fa.readFileSync(packagesPath, true, "utf8")
            );
            const pkg = (packagesJson.packages || []).find(
              (p) => p.name === data.package
            );

            if (!pkg) {
              // this.crt.textOut(`⚠️ Package '${data.package}' tidak ditemukan`);
              return;
            }

            for (const item of pkg.items || []) {
              try {
                await stack.send(client, JSON.stringify({ type: "preparing" }));
                const srcPath = item.src;
                const fileData = this.fa.readFileSync(srcPath, true, "utf8");
                const compressed = zlib.deflateSync(fileData);
                const base64Data = compressed.toString("base64");

                const filePacket = {
                  type: "file",
                  filename: item.dst,
                  data: base64Data,
                };

                await stack.send(client, JSON.stringify(filePacket), {
                  packetHeaderFlag: flags.FLAG_FILE_SENDING,
                });
                // this.crt.textOut(`📦 Sent file: ${item.dst}`);
              } catch (err) {
                this.crt.textOut(
                  `❌ Gagal membaca/kirim file '${item.src}': ${err.message}`
                );
              }
            }

            const donePacket = { type: "done", onAfterDownload: pkg.onAfterDownload };
            await stack.send(client, JSON.stringify(donePacket));
            // this.crt.textOut(`✅ Finished sending package '${pkg.name}'`);
          }
        } catch (err) {
          this.crt.textOut(`❌ Error parsing payload: ${err.message}`);
        }
      });
    });

    this.exitSignal = () => {
      stack.close();
      stack = null
      this.crt.textOut("⛔ Package server stopped.");
    };

    this.crt.textOut(`🚀 Package Server ready at port ${port}`);
  },
};
