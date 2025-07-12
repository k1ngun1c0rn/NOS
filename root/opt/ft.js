// =============================================
// ft.js - NOSPacketStack File Transfer Client
// =============================================

module.exports = {
  name: "ft",
  version: "0.8",
  main: function (nos) {
    const chaSharekey =
      bfs.require(`/lib/api-shop.js`).chaSharekey;
    this.shell.loadDevices(
      [
        { name: __APP.defaultComm, objectName: "mqtnl" },
        { name: "bfsAccess", objectName: "fa" },
      ],
      this
    );

    let port = 405;
    let host = "";

    const args = this.shell.parseCommand(this.shell.lastCmd);
    host = args.params._ ? args.params._[0] : null;
    const targetPackage = args.params._ ? args.params._[2] : null;

    if (args.params && args.params.p) {
      port = parseInt(args.params.p);
    }

    if (host == null) {
      this.crt.textOut(`Syntax: ${args.command} -h <host> [-p port]`);
      this.shell.terminate();
      return;
    }
    let cha = __APP.core.encryption.addInstance("ft", "chacha20-poly1305");

    const publicKey = this.fa.readFileSync(`/opt/conf/public.pem`, "utf8");
    const conn = new this.mqtnl.mqtnlConnection(
      this.mqtnl.connMgr,
      this.mqtnl.connMgr.ports.allocateRandomPort(1000, 65000),
      null,
      true
    );
    const stack = new chaSharekey(conn);
    const dst = { address: host, port: parseInt(port) };

    function makeSharedKey() {
      return "Hello world";
    }

    async function connect() {
      await new Promise((resolve) => {
        const crypto = require("crypto");
        const mySecretKey = crypto.randomBytes(32);
        cha.setKey(mySecretKey);
        stack.negotiateKeyExchangeAsClient(
          dst,
          () => mySecretKey.toString("hex"),
          (sharedKey, src) => {
            const session = stack.getSession(src);
            session.cha = cha;
            cha.agentName = `ft${session.id}`;
            stack.setAgentFor(src, session.cha);
            stack.setTTLFor(src, 60000 * 30);
            stack.activeSession = stack.getSession(src);
            this.crt.textOut(
              "✅ Secure session established. Ready to send manual commands."
            );
            resolve(); // selesai
          }
        );
      });
    }
    setTimeout(async () => {
      await connect();
    }, 500);

    const userPrompt = bfs.require("/base/basicShell").userPromptAsync;
    let cmd;
    // new userPrompt("> ", this.shell, async (data) => {
    new userPrompt(
      {
        prompt: "> ",
        shell: this.shell,
        once: false,
        echo: true,
        cmdExit: "exit",
      },
      async (data) => {
        cmd = data;

        if (cmd.startsWith("connect")) {
          connect();
        } else if (cmd.startsWith("disconnect")) {
          stack.send(dst, "disconnect");
          stack.deleteSession(dst);
          stack.activeSession.established = false;
          stack.activeSession = null;
        } else if (cmd.startsWith("status")) {
          if (stack.activeSession?.established === true) {
            this.crt.textOut("Connected");
          } else {
            this.crt.textOut("Disconnected");
          }
        } else if (cmd === "exit") {
          this.shell.terminate();
        } else if (cmd.startsWith("auth")) {
          const args = cmd.split(" ");
          stack.send(dst, `__auth::${args[1] ? args[1] : ""}`);
          await new Promise((resolve) => {
            stack.onDecryptedMessage((payload, src) => {
              this.crt.textOut(payload);
              resolve();
            });
          });
        } else if (cmd.startsWith("put")) {
          const args = cmd.split(" ");
          let error = 0;
          let content;
          try {
            content = this.fa.readFileSync(args[1], true);
          } catch (e) {
            this.crt.textOut(e);
            error = 1;
          }
          if (error == 0) {
            // this.crt.textOut(`Filename: ${this.shell.basePath + args[1]}`);
            // this.crt.textOut(` Content: ${content}`);
            const zlib = require("zlib");
            const compressedData = zlib.deflateSync(content).toString("base64");
            // const compressedData = content.toString("base64");
            const json = {
              mode: "sendfile",
              path: args[2] ? args[2] : args[1],
              content: compressedData,
              // content: content
            };
            stack.send(dst, JSON.stringify(json));
          }
          await new Promise((resolve) => {
            stack.onDecryptedMessage((payload, src) => {
              if (payload === "__session::timeout") {
                stack.activeSession.established = false;
              } else {
                if (stack.activeSession.established === true) {
                  let opayload;
                  try {
                    opayload = JSON.parse(payload);
                  } catch (e) {
                    opayload = { type: "msg", content: payload };
                    // this.crt.textOut(payload);
                  }
                  if (opayload.type == "msg")
                    this.crt.textOut(opayload.content);
                }
              }
              resolve();
            });
          });
        } else {
          if (cmd.trim().length > 0) {
            if (stack.activeSession?.established === false) {
              this.crt.textOut("⏱️  Session timeout!");
              return;
            }
            await new Promise((resolve) => {
              if (cmd.trim().length > 0) {
                stack.send(dst, cmd);
                stack.onDecryptedMessage((payload, src) => {
                  if (payload === "__session::timeout") {
                    stack.activeSession.established = false;
                  } else {
                    if (stack.activeSession.established === true) {
                      let opayload;
                      try {
                        opayload = JSON.parse(payload);
                      } catch (e) {
                        opayload = { type: "msg", content: payload };
                        // this.crt.textOut(payload);
                      }
                      if (opayload.type == "msg")
                        this.crt.textOut(opayload.content);
                      else if (opayload.type == "get") {
                        let error = 0;
                        try {
                          const zlib = require("zlib");
                          const uncompressedData = zlib.inflateSync(
                            Buffer.from(opayload.content, "base64")
                          );
                          this.fa.writeFileSync(opayload.out, uncompressedData);
                        } catch (e) {
                          this.crt.textOut(`❌ ${e}`);
                          error = 1;
                        }
                        if (error == 0)
                          this.crt.textOut(
                            "📄 File has been written successfuly."
                          );
                      }
                    }
                  }
                  resolve();
                });
              }
            });
          }
        }
      }
    );

    // stack.onDecryptedMessage((payload, src) => {
    //     this.crt.textOut(payload);
    //     // this.shell.terminate();
    // });

    this.exitSignal = () => {
      // stack.close(stack.activeSession);
      // this.crt.textOut("⛔ FTP Client stopped.");
    };
  },
};
