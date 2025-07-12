module.exports = {
  instanceName: "nosdesktop",
  name: "NOS Desktop",
  version: 0.6,
  needRoot: true,
  author: "Andriansah",
  main: function (nos) {
    var devices = [
      { name: "websocket1", objectName: "ws" },
      { name: "bfsAccess", objectName: "fa" },
      { name: "syslogger", objectName: "syslog" },
    ];
    this.failed = !this.shell.loadDevices(devices, this);
    if (this.failed) {
      this.shell.terminate();
      return;
    }

    this.generateUUID = () => {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    let webshell;
    const ws = this.ws;
    this.msg = `✅ NOS Desktop starting`;
    this.crt.textOut(this.msg);
    if (!this.ws.remoteFunction) this.ws.remoteFunction = {};
    this.ws.remoteFunction.desktop = {}; // Create a namespace

    let apps = [];
    this.sendMessage = (msgChannel, cb) => {
      this.ws.sendMessage(msgChannel, cb);
    };

    this.ws.remoteFunction.desktop.getLaunchers = (params) => {
      apps = [];
      let appFiles = this.fa.readdirSync("/opt/gui/apps");
      appFiles.forEach((fn) => {
        let application = null;
        application = bfs.require(`/opt/gui/apps/${fn}`, { noCache: true }).application();
        if (application.header.active === true) {
          application.header.fileName = fn;
          apps.push(application);
        }
      });

      let launchers = [];
      let x = 10;
      let y = 0;
      for (let i = 0; i < apps.length; i++) {
        apps[i].header.x = x;
        apps[i].header.y = y;
        y += 75;
        if ((i + 1) % 7 == 0) {
          x += 80;
          y = 0;
        }
        launchers.push({
          header: apps[i].header,
        });
      }
      return btoa(JSON.stringify(launchers));
    };
    this.ws.remoteFunction.desktop.jsContentError = (params) => {
      const completeMsg = `Error in JS content: \nappName: ${params[1]}\nappUUID: ${params[2]}\n${params[0]}`;
      this.syslog.append(`Error in ${this.name}\n${completeMsg}`);
      // this.crt.textOut(completeMsg);
    }
    this.ws.remoteFunction.desktop.getModule = (params) => {
      let appName = params[0];
      // Cari file terbaru langsung dari filesystem
      let appFiles = this.fa.readdirSync("/opt/gui/apps");
      for (let fn of appFiles) {
        let application = bfs.require(`/opt/gui/apps/${fn}`, { noCache: true }).application(this.generateUUID());
        if (application.header.active === true && application.header.appName == appName) {
          let content = {
            header: application.header,
            content: encodeURIComponent(application.content),
            jsContent: encodeURIComponent(application.jsContent.toString()),
          };
          try {
            application.main(this, nos);
          } catch (e) {
            this.crt.textOut(e + "\n" + e.stack);
          }
          return btoa(JSON.stringify(content));
        }
      }
    };

    // this.shell.terminate();
  },
  // 🎖️ exitSignal pakai Promise
  exitSignal: function () {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(); // Wajib panggil resolve biar core tahu selesai
      }, 500); // simulasi delay
    });
  },
};

// dec:/home root⚡ (node:553034) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 11 resize listeners added to [WriteStream]. MaxListeners is 10. Use emitter.setMaxListeners() to increase limit
// (Use `node --trace-warnings ...` to show where the warning was created)
