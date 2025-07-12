module.exports = {
  application: () => {
    let appName = "terminal";
    let appTitle = "Terminal microShell";
    let appContent = {
      header: {
        appName: appName,
        appTitle: appTitle,
        active: true,
        version: "1.2",
        iconSmall: "icon_16_terminal.png",
        iconMedium: "icon_22_terminal.png",
        iconLarge: "icon_32_terminal.png",
        width: 600,
        height: 385,
        resizable: true,
        maximizable: false,
      },
      content: `
      <style>
        #main-content-terminal {
          width: 100%;
          height: 100%;
          min-height: 0;
          min-width: 0;
          overflow: hidden;
        }
      </style>
      <div id="main-content-${appName}"></div>
      `,
      // Server side
      main: (sender, nos) => {
        let webShell = null;
        sender.ws.remoteFunction.desktop.getKey = (params) => {
          let key = params[0];
          let code = params[1];
          let ctrl = params[2];
          let shift = params[3];

          // if (key == 127) key = "\b";

          let io = {
            key: {
              name: String.fromCharCode(key),
              sequence: code,
              ctrl: ctrl,
              shift: shift,
            },
          };
          webShell.pushIOKey(io);
          return [];
        };

        sender.ws.remoteFunction.desktop.webshell = {}; // Namespace

        sender.ws.remoteFunction.desktop.webshell.shellResize = (params) => {
          let cols = params[0];
          let rows = params[1];
          if (webShell) {
            webShell.resizeScreenSize(rows, cols);
            if (webShell.onResizeListener)
              webShell.onResizeListener.forEach((listener) => {
                if (typeof listener === "function") {
                  listener(rows, cols);
                }
              })
          }
        }

        sender.ws.remoteFunction.desktop.terminalReady = (params) => {
          try {
            const { Shell } = bfs.require(`/base/microShell`);
            webShell = new Shell(
              `%hostname:%pwd %username%roottag `,
              "Terminal",
              nos,
              (output) => {
                if (output.charCodeAt(0) == 127) output = "\b";
                if (webShell.transmittActive) {
                  sender.sendMessage(`ngs/${appName}`, {
                    type: "crtOut",
                    output: output.replace(/\n/g, "\r\n") //.replaceAll("\u001b[?25h", "\b")
                  });
                }
              },
              false // Authentication mode
            );
            webShell.parentShell = sender.shell;
            webShell.sysConfig = nos.sysConfig;
            webShell.envPath = "/base;/opt;/home";
            webShell.syslog = nos.getDevice("syslogger");
            webShell.pwd = "/home/";
            webShell.username = "root";
            webShell.rootActive = true;

            let dirContents = sender.fa.getDirectoryContents("/base");
            webShell.term.autoCompletionList =
              webShell.term.autoCompletionList.concat(dirContents);

            dirContents = sender.fa.getDirectoryContents("/opt");
            webShell.term.autoCompletionList =
              webShell.term.autoCompletionList.concat(dirContents);
            nos.executeModule(
              `/opt`,
              "historylogger",
              null,
              webShell
            );

            webShell.greeting(
              () => {
                webShell.transmittActive = true;
              },
              () => {
                webShell.transmittActive = false;
                sender.sendMessage(`ngs/${appName}`, {
                  type: "notif",
                  msg: "wrong password",
                });
              }
            );
          } catch (e) {
            console.log(`${JSON.stringify(e)}`);
          }
        };
      },
      jsContent: (app) => {
        // Client side

        const term = new Terminal({
          smoothScrollingStepInterval: 10,
          minimumContrastRatio: 1,
          fontFamily: '"Cascadia Code", Menlo, monospace',
          fontSize: 12,
          encoding: 'UTF-8',
          cursorBlink: false,
        });
        window.term = term;

        // --- Tambahan agar terminal fit ke div ---
        // Asumsi FitAddon sudah di-load di index.html dan tersedia di window.FitAddon
        const fitAddon = new window.FitAddon.FitAddon();
        term.loadAddon(fitAddon);

        RFC.registerListener(`ngs/${app.header.appName}`, (data) => {
          if (data.type == "crtOut") {
            window.term.write(data.output);
          } else if (data.type == "notif" && data.msg == "wrong password") {
            showNedryMagicWord();
          }
        });

        // Fungsi untuk menampilkan notifikasi bootstrap
        function showResizeNotification(cols, rows) {
          // Hapus notifikasi lama jika ada
          let old = document.getElementById('term-resize-alert');
          if (old) old.remove();
          const alert = document.createElement('div');
          alert.id = 'term-resize-alert';
          alert.className = 'alert alert-info fade show position-absolute';
          alert.style.zIndex = 1000;
          alert.style.top = '50%';
          alert.style.left = '50%';
          alert.style.transform = 'translate(-50%, -50%)';
          alert.style.textAlign = 'center';
          alert.style.minWidth = '120px';
          alert.style.fontWeight = 'bold';
          alert.innerHTML = `[${cols}:${rows}]`;
          // Masukkan ke parent terminal
          const parent = document.getElementById('main-content-terminal')?.parentElement || document.body;
          parent.appendChild(alert);
          setTimeout(() => {
            alert.classList.remove('show');
            alert.classList.add('fade');
            setTimeout(() => alert.remove(), 500);
          }, 1000);
        }

        term.onResize(({ cols, rows }) => {
          console.log(`client side resize ${cols}x${rows}`);
          RFC.callRFC("desktop.webshell.shellResize", [cols, rows], (ret) => { });
          showResizeNotification(cols, rows);
        });

        term.onData((e) => {
          if (e == "\u0006") {//Ctrl+F
            document.querySelector("body").requestFullscreen();
          } else if (e == "\u0003") {
            // Ctrl+C
            RFC.callRFC("desktop.getKey", [3, "\x03", true], (ret) => { });
          } else if (e == "\u0013") {
            // Ctrl+S
            RFC.callRFC("desktop.getKey", ["\r", "\x13", true], (ret) => { });
          } else
            RFC.callRFC("desktop.getKey", [e.charCodeAt(0), e], (ret) => { });
        });

        const mainDiv = document.getElementById("main-content-terminal");
        term.open(mainDiv);
        fitAddon.fit();
        // Responsive saat window resize
        window.addEventListener('resize', () => fitAddon.fit());
        // Jika parent div bisa berubah size karena layout, bisa juga observer
        const resizeObserver = new window.ResizeObserver(() => fitAddon.fit());
        resizeObserver.observe(mainDiv);

        RFC.callRFC("desktop.terminalReady", [], (ret) => { });
      },
    };
    return appContent;
  },
};
