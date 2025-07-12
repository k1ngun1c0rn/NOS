module.exports = {
  instanceName: "dynamic_rsh_psv2",
  name: "Dynamic RSH (PacketStackV2)",
  version: "1.5",
  needRoot: false,
  main: function (nos) {
    const NOSPacketStackV2 = bfs.require(`/lib/NOSPacketStackV2.js`);
    const chaSharekey = bfs.require(`/lib/api-shop.js`).chaSharekey;
    const path = require("path");

    const commDevice = __APP.defaultComm;
    const devices = [
      { name: commDevice, objectName: "mqtnl" },
      { name: "bfsAccess", objectName: "fa" },
    ];
    this.shell.loadDevices(devices, this);

    const mqtnl = this.mqtnl;

    let port = 25;
    let host = "";

    const args = this.shell.parseCommand(this.shell.lastCmd);
    host = args.params._ ? args.params._[0] : null;
    const cmd = args.params._ ? args.params._[1] : null;
    const targetPackage = args.params._ ? args.params._[2] : null;

    if (args.params && args.params.p) {
      port = parseInt(args.params.p);
    }

    if (!host) {
      this.crt.textOut(`Syntax: ${args.command} <host> [-p port]`);
      this.shell.terminate();
      return;
    }

    let srcPort = mqtnl.connMgr.ports.allocateRandomPort(1000, 65000);
    const conn = new mqtnl.mqtnlConnection(mqtnl.connMgr, srcPort, null, true);

    const packetStack = new chaSharekey(conn);
    let remoteShellActive = true;

    let cha = __APP.core.encryption.addInstance(
      "airterm" + srcPort,
      "chacha20-poly1305",
      // "reverse"
    );
    // const reverseAgent = {
    //   name: "reverse",
    //   cipher: (data) => data.split("").reverse().join(""),
    //   decipher: (data) => data.split("").reverse().join("")
    // };

    packetStack.onDecryptedMessage((payload, src) => {
      if (src.address !== host || src.port !== parseInt(port)) return;

      if (payload === "!connectAccept!") {
        let rows = process.stdout.rows;
        let cols = process.stdout.columns;
        packetStack.send(
          src,
          JSON.stringify({ payload: `__termresize::${rows},${cols}` }),
        );
        remoteShellActive = true;
        this.parentShell = this.shell;
        this.parentShell.keyboardActive = false;
      } else if (payload === "!exit!") {
        this.parentShell.keyboardActive = true;
        if (remoteShellActive) this.parentShell.terminate();
        remoteShellActive = false;
      } else {
        if (remoteShellActive == true) this.crt.write(payload);
      }
    });

    const dst = { address: host, port: parseInt(port) };
    const crypto = require("crypto");
    let mySecretKey = crypto.randomBytes(32);
    // mySecretKey = crypto.createHash("sha256").update(mySecretKey).digest();
    // mySecretKey = crypto.createHash("sha256").update(mySecretKey + ":" + (new Date().getTime()) + ":" + Math.random()).digest();
    // console.log(`secret key ${mySecretKey.toString("hex")}`);
    cha.setKey(mySecretKey);

    const knownHostsPath = "/home/.nos_known_hosts";

    function getKnownHosts(fileAccess, knownHostsPath) {
      try {
        if (fileAccess.fileExistsSync(knownHostsPath)) {
          const lines = fileAccess.readFileSync(knownHostsPath).split("\n");
          const map = {};
          lines.forEach((line) => {
            const [hostport, fingerprint] = line.trim().split(" ");
            if (hostport && fingerprint) map[hostport] = fingerprint;
          });
          return map;
        }
      } catch (e) {}
      return {};
    }

    function saveKnownHost(
      fileAccess,
      knownHostsPath,
      host,
      port,
      fingerprint,
    ) {
      const hostport = `${host}:${port}`;
      let lines = [];
      if (fileAccess.fileExistsSync(knownHostsPath)) {
        lines = fileAccess
          .readFileSync(knownHostsPath)
          .split("\n")
          .filter(Boolean);
        // Remove old entry
        lines = lines.filter((line) => !line.startsWith(hostport + " "));
      }
      lines.push(`${hostport} ${fingerprint}`);
      fileAccess.writeFileSync(knownHostsPath, lines.join("\n") + "\n");
    }

    // PATCH: intercept key exchange to verify fingerprint with NOS userPrompt and fileAccess
    packetStack.negotiateKeyExchangeAsClient = async (
      dst,
      makeSharedKeyFn,
      onFinish,
    ) => {
      const sharedKey = makeSharedKeyFn();
      let waiting = true;
      const crypto = require("crypto");
      const fileAccess = this.fa;
      const knownHosts = getKnownHosts(fileAccess, knownHostsPath);
      const hostport = `${dst.address}:${dst.port}`;
      const shell = this.shell;

      packetStack._sharedKeyHandler = async (type, src, payload) => {
        if (!waiting) return;
        if (type === "pubkey") {
          let pub, fingerprint;
          if (payload.includes("::")) {
            [, pub, fingerprint] = payload.split("::");
          } else {
            pub = payload;
            fingerprint = crypto.createHash("sha256").update(pub).digest("hex");
          }
          // Cek fingerprint
          if (knownHosts[hostport] && knownHosts[hostport] !== fingerprint) {
            packetStack.send(dst, "__status::abort");
            shell.crt.textOut(
              `\n🚨 WARNING: Server fingerprint mismatch!\nExpected: ${knownHosts[hostport]}\nReceived: ${fingerprint}\nConnection aborted.\n`,
            );
            waiting = false;
            return;
          } else if (!knownHosts[hostport]) {
            shell.crt.textOut(
              `\n🔑 Server fingerprint: ${fingerprint}\nFirst connection to ${hostport}.\n`,
            );
            let answer = await shell.userPrompt(
              "Type 'yes' to accept and save this fingerprint: ",
              true,
            );
            if (answer.trim().toLowerCase() !== "yes") {
              packetStack.send(dst, "__status::abort");
              shell.crt.textOut("Connection aborted by user.\n");
              waiting = false;
              return;
            }
            saveKnownHost(
              fileAccess,
              knownHostsPath,
              dst.address,
              dst.port,
              fingerprint,
            );
            shell.crt.textOut("Fingerprint saved.\n");
          }
          const encrypted = crypto
            .publicEncrypt(
              {
                key: pub,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              },
              Buffer.from(sharedKey, "hex"),
            )
            .toString("hex");
          packetStack.send(dst, `__secretkey::${encrypted}`);
        } else if (type === "done") {
          packetStack.getSession(src).established = true;
          waiting = false;
          if (typeof onFinish === "function") onFinish(sharedKey, dst);
        }
      };
      packetStack.send(dst, "__request::key-exchange");
    };

    packetStack.negotiateKeyExchangeAsClient(
      dst,
      () => mySecretKey.toString("hex"),
      (sharedKey, src) => {
        const session = packetStack.getSession(src);
        session.cha = cha;
        // cha.setKey(Buffer.from(sharedKey, "hex"));
        cha.agentName = `airterm${session.id}`;
        packetStack.setAgentFor(src, session.cha);
        packetStack.setTTLFor(src, 60000 * 30);
        remoteShellActive = true;

        process.stdout.on("resize", () => {
          let rows = process.stdout.rows;
          let cols = process.stdout.columns;
          packetStack.send(
            dst,
            JSON.stringify({ payload: `__termresize::${rows},${cols}` }),
          );
        });

        if (!this.shell.onResizeListener) this.shell.onResizeListener = [];

        this.shell.onResizeListener.push((rows, cols) => {
          packetStack.send(
            dst,
            JSON.stringify({ payload: `__termresize::${rows},${cols}` }),
          );
        });
        packetStack.send(dst, JSON.stringify({ payload: "requestConnect" }));
        setTimeout(() => {
          packetStack.send(
            dst,
            JSON.stringify({
              payload: `__termresize::${this.shell.crt.rows},${this.shell.crt.columns}`,
            }),
          );
        }, 2000);
      },
    );

    let ctrlCCount = 0;
    let ctrlCTimer = null;
    this.shell.emitIOKey = (io) => {
      if (io.key.ctrl === true && io.key.name == "c") {
        // Control + C
        ctrlCCount++;
        if (ctrlCTimer) clearTimeout(ctrlCTimer);
        ctrlCTimer = setTimeout(() => {
          ctrlCCount = 0; // Reset counter setelah 2 detik
        }, 1000);
        if (ctrlCCount >= 3) {
          ctrlCCount = 0; // Reset setelah sukses deteksi 3x
          this.crt.textOut("\n🚨 Exit remote terminal");
          this.parentShell.keyboardActive = true;
          remoteShellActive = false;
        }
      }
      if (!this.shell.keyboardActive) {
        packetStack.send(dst, JSON.stringify({ payload: "io", io }));
      }
    };
  },
};
