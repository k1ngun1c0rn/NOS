// ============================================
// pkg.js - NOS Package Manager Client (one-shot style)
// ============================================

const path = require("path");
const zlib = require("zlib");

module.exports = {
  name: "pkg",
  version: "0.78",
  needRoot: true,
  main: function (nos) {
    const flags = bfs.require(`/lib/packetFlags.js`);
    const chaSharekey = bfs.require(`/lib/api-shop.js`).chaSharekey;
    const checksig = bfs.require("/lib/pkglib");
    this.shell.loadDevices(
      [
        { name: __APP.defaultComm, objectName: "mqtnl" },
        { name: "bfsAccess", objectName: "fa" },
      ],
      this,
    );
    function dynamicUnit(size) {
      if (size < 1024 * 1024) return (size / 1024).toFixed(2) + "KB";
      else return (size / (1024 * 1024)).toFixed(2) + "MB";
    }
    function drawProgressBar(percentage) {
      const barLength = 30; // panjang bar
      const filledLength = Math.round((percentage / 100) * barLength);
      const emptyLength = barLength - filledLength;
      const bar =
        "[" +
        "#".repeat(filledLength) +
        "-".repeat(emptyLength) +
        `] ${percentage}%`;
      return bar;
    }
    let port = 406; // Default port
    const args = this.shell.parseCommand(this.shell.lastCmd);
    const host = args.params._ ? args.params._[0] : null;
    const cmd = args.params._ ? args.params._[1] : null;
    const targetPackage = args.params._ ? args.params._[2] : null;

    if (args.params && args.params.p) {
      port = parseInt(args.params.p);
    }

    if (!host || !cmd) {
      this.crt.textOut("❌ Gunakan: pkg <host> list | install <package>");
      this.shell.terminate();
      return;
    }
    const publicKey = this.fa.readFileSync(`/opt/conf/public.pem`, "utf8");

    let cha = nos.__CORE.encryption.addInstance(
      "pkg",
      "chacha20-poly1305",
      nos.sysConfig.chacha20poly.key,
    );
    const conn = new this.mqtnl.mqtnlConnection(
      this.mqtnl.connMgr,
      this.mqtnl.connMgr.ports.allocateRandomPort(1000, 65000),
      null,
      true,
    );
    conn.onPacketReceive((packet, key) => {
      if (packet.header.packetHeaderFlag != flags.FLAG_FILE_SENDING) return;
      const { packetCount, packetIndex } = packet.header;

      if (packetCount > 0) {
        const percent = Math.floor(((packetIndex + 1) / packetCount) * 100);
        const progressBar = drawProgressBar(percent);
        this.crt.write(`\r${progressBar}`);
        if (percent === 100) {
          console.log(""); // pindah baris kalau selesai
        }
      }
    });

    const stack = new chaSharekey(conn);
    const dst = { address: host, port: parseInt(port) };
    const crypto = require("crypto");
    const mySecretKey = crypto.randomBytes(32);
    // this.crt.textOut("Shared key front: " + mySecretKey.toString("hex"));
    cha.setKey(mySecretKey);
    stack.negotiateKeyExchangeAsClient(
      dst,
      () => mySecretKey.toString("hex"),
      (sharedKey, src) => {
        const session = stack.getSession(src);
        session.cha = cha;
        cha.agentName = `pkg${session.id}`;
        stack.setAgentFor(src, session.cha);
        stack.setTTLFor(src, 60000 * 5);
        stack.activeSession = stack.getSession(src);
        // this.crt.textOut(`✅ Secure session established to ${host}`);

        if (cmd === "status") {
          const metaPath = "/opt/conf/packages.meta.json";
          let meta = { packages: [] };
          if (this.fa.fileExistsSync(metaPath)) {
            try {
              meta = JSON.parse(this.fa.readFileSync(metaPath, "utf8"));
            } catch (e) {
              this.crt.textOut("❌ Error reading meta file.");
              this.shell.terminate();
              return;
            }
          }

          // Helper untuk ambil versi repo
          const getRepoVersion = async (pkgName) => {
            return new Promise((resolve) => {
              stack.send(
                dst,
                JSON.stringify({ type: "getinfo", package: pkgName }),
              );
              stack.onDecryptedMessage((payload, src) => {
                try {
                  const info = JSON.parse(payload);
                  // this.crt.textOut(JSON.stringify(info));
                  if (info.data == "Package not found!") {
                    this.crt.textOut("Package not found!");
                    resolve("-");
                  } else if (info.type === "packageInfo" && info.data) {
                    resolve(String(info.data.version));
                  }
                } catch {
                  resolve("-");
                }
              });
            });
          };

          // Jika ada targetPackage, cek satu paket
          if (targetPackage) {
            const metaPkg = meta.packages.find((p) => p.name === targetPackage);
            const localVersion = metaPkg ? String(metaPkg.version) : "-";
            getRepoVersion(targetPackage).then((repoVersion) => {
              if (repoVersion !== "-") {
                this.crt.textOut(
                  `📦 ${targetPackage}\n  Lokal: ${localVersion}\n  Repo : ${repoVersion}\n`,
                );
              }
              this.shell.terminate();
            });
          } else {
            // Cek semua paket di meta
            if (meta.packages.length === 0) {
              this.crt.textOut("There are no packages installed locally.");
              this.shell.terminate();
              return;
            }
            let idx = 0;
            const printNext = () => {
              if (idx >= meta.packages.length) {
                this.shell.terminate();
                return;
              }
              const pkg = meta.packages[idx];
              getRepoVersion(pkg.name).then((repoVersion) => {
                this.crt.textOut(
                  `📦 ${pkg.name}\n  Local: ${pkg.version}\n  Repo : ${repoVersion == "-" ? "Not availale" : repoVersion}\n`,
                );
                idx++;
                printNext();
              });
            };
            printNext();
          }
          return;
        } else if (cmd === "list") {
          stack.send(dst, JSON.stringify({ type: "list" }));

          stack.onDecryptedMessage(async (payload, src) => {
            try {
              if (
                typeof payload === "string" &&
                payload.trim().startsWith("{")
              ) {
                const data = JSON.parse(payload);
                if (
                  data.type === "list-reply" &&
                  Array.isArray(data.packages)
                ) {
                  const signerFP = data.fingerPrintRepository;
                  // console.log(`signerFP: ${signerFP}`);
                  let trustedSource =
                    nos.sysConfig.packageManager.trustedSigners.includes(
                      signerFP,
                    );
                  if (!trustedSource) {
                    this.crt.textOut(
                      `⚠️ Signature is valid, but the signer is not on your trusted list.\nFingerprint: ${signerFP}`,
                    );
                  } else {
                    this.crt.textOut(
                      `✅ Signature is valid and was signed by a trusted host.`,
                    );
                  }
                  if (data.packageSignatureStatus === true)
                    this.crt.textOut(`✅ Metadata signature status valid`);
                  else this.crt.textOut(`❌ Metadata signature status invalid`);
                  this.crt.textOut("📦 Available Packages:");
                  data.packages.forEach((pkg) => {
                    this.crt.textOut(
                      `- ${pkg.name} (v${pkg.version}) by ${pkg.author}\n  ${pkg.description}\n  ${pkg.status} signature\n ` +
                      ` ${pkg.isPackageSafe
                        ? "✅ This package does not modify system files or run scripts automatically."
                        : "⚠️ **This package contain scripts that can affect your system.\n    Please review before installing!"
                      }\n`,
                    );
                  });
                } else {
                  this.crt.textOut("⚠️ Format list invalid.");
                }
                this.shell.terminate();
              }
            } catch (e) {
              this.crt.textOut(`❌ Error parsing list: ${e}`);
              this.shell.terminate();
            }
          });
        } else if (cmd === "install" && targetPackage) {
          // --- PATCH: Version check and meta file management ---
          const metaPath = "/opt/conf/packages.meta.json";
          let meta = { packages: [] };
          if (this.fa.fileExistsSync(metaPath)) {
            try {
              meta = JSON.parse(this.fa.readFileSync(metaPath, "utf8"));
            } catch (e) { }
          }

          // 1. Request package info first
          stack.send(
            dst,
            JSON.stringify({ type: "getinfo", package: targetPackage }),
          );
          let needReboot = 0;
          stack.onDecryptedMessage(async (payload, src) => {
            try {
              const info = JSON.parse(payload);
              if (info.type === "packageInfo" && info.data) {
                const repoVersion = String(info.data.version);
                const pkgName = info.data.name;
                needReboot = info.data.needReboot;
                // Cari versi lokal di meta
                let metaPkg = meta.packages.find((p) => p.name === pkgName);
                let metaVersion = metaPkg ? String(metaPkg.version) : null;

                // Jika sudah ada dan versi sama/lebih besar, prompt user
                if (
                  metaVersion &&
                  (metaVersion === repoVersion || metaVersion > repoVersion)
                ) {
                  this.crt.textOut(
                    `⚠️  Package '${pkgName}' is already at version ${metaVersion} (repo: ${repoVersion}). Continue install? (y/n): `,
                  );
                  const answer = await this.shell.userPrompt(
                    "Type 'yes' to continue installation: ",
                    true,
                  );
                  if (answer.trim().toLowerCase() !== "yes") {
                    this.crt.textOut("❌ Install cancelled by user.");
                    this.shell.terminate();
                    return;
                  }
                }

                // Lanjutkan proses install (request file)
                stack.send(
                  dst,
                  JSON.stringify({ type: "get", package: targetPackage }),
                );

                let pendingFiles = 0;
                const self = this;
                stack.onDecryptedMessage(async (payload2, src2) => {
                  try {
                    const data = JSON.parse(payload2);
                    if (data.type === "preparing") {
                      self.crt.textOut("Downloading ...");
                    } else if (data.type === "file") {
                      const compressedBuffer = Buffer.from(data.data, "base64");
                      const fileBuffer = zlib.inflateSync(compressedBuffer);
                      const dstPath = data.filename;
                      const dstDir = path.dirname(
                        dstPath,
                      );
                      try {
                        self.fa.mkdirSync(dstDir, { recursive: true });
                      } catch (e) { }
                      self.fa.writeFileSync(dstPath, fileBuffer, true);
                      self.crt.textOut(
                        `📂 Saved file: ${data.filename} (${dynamicUnit(fileBuffer.length)})`,
                      );
                      pendingFiles++;
                    } else if (data.type === "done") {
                      if (typeof data.onAfterDownload != "undefined") {
                        self.crt.textOut(
                          `Executing installation script ...` +
                          data.onAfterDownload,
                        );
                        const directory = path.dirname(data.onAfterDownload);
                        const fileName = path.basename(data.onAfterDownload);
                        // console.log("**" + directory + "|" + fileName + "**");
                        nos.executeModule(
                          directory,
                          fileName,
                          () => { },
                          self.shell,
                          self.shell.rootActive,
                          self.shell.lastCmd,
                        );
                      }
                      // Update meta file setelah install sukses
                      let idx = meta.packages.findIndex(
                        (p) => p.name === pkgName,
                      );
                      if (idx >= 0) {
                        meta.packages[idx].version = repoVersion;
                      } else {
                        meta.packages.push({
                          name: pkgName,
                          version: repoVersion,
                        });
                      }
                      self.fa.writeFileSync(
                        metaPath,
                        JSON.stringify(meta, null, 2),
                      );
                      self.crt.textOut(
                        `✅ Install selesai. ${pendingFiles} file diunduh`,
                      );
                      if (needReboot === true) {
                        const answer = await this.shell.userPrompt(
                          "This package need reboot, type 'yes' to continue reboot: ",
                          true,
                        );
                        if (answer.trim().toLowerCase() == "yes") {
                          nos.shutdown(1); //errorlevel 1 untuk reboot, feeder ke bootstrap.sh
                        }
                      }
                      self.shell.terminate();
                    }
                  } catch (e) {
                    self.crt.textOut(
                      `❌ Error parsing/installing file: ${JSON.stringify(e)}`,
                    );
                    self.shell.terminate();
                  }
                });
              } else {
                this.crt.textOut("❌ Failed to get package info from server.");
                this.shell.terminate();
              }
            } catch (e) {
              this.crt.textOut(
                `❌ Error parsing package info: ${JSON.stringify(e)}`,
              );
              this.shell.terminate();
            }
          });
        } else {
          this.crt.textOut(
            "❓ Unknown command. Gunakan 'list' atau 'install <package>'.",
          );
          this.shell.terminate();
        }
      },
    );
  },
};
