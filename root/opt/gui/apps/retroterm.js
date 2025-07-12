module.exports = {
  application: (uuid) => {
    let appName = "retroterminal";
    let appTitle = "Retro Terminal";
    let appContent = {
      header: {
        appName: appName,
        appTitle: appTitle,
        uuid,
        active: true,
        version: "1.2",
        iconSmall: "icon_16_terminal.png",
        iconMedium: "icon_22_terminal.png",
        iconLarge: "icon_32_terminal.png",
        width: 710,
        height: 460,
        resizable: true,
        maximizable: false,
      },
      content: `
      <style>
        #main-content-${appName}-${uuid} {
          width: 100%;
          height: 100%;
          min-height: 0;
          min-width: 0;
          overflow: hidden;
        }          
      </style>
      <div id="main-content-${appName}-${uuid}"></div>
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
              });
          }
        };

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
                    output: output.replace(/\n/g, "\r\n"), //.replaceAll("\u001b[?25h", "\b")
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
            nos.executeModule(`/opt`, "historylogger", null, webShell);

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
          smoothScrollingStepInterval: 1,
          minimumContrastRatio: 2,
          fontFamily: "VT323, Consolas, monospace",
          fontSize: 22,
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
            for (let i = 0; i < 10; i++)
              window.term.write("Access denied!\r\n");
            setTimeout(() => {
              showNedryMagicWord();
            }, 1000);
          }
        });

        // Fungsi untuk menampilkan notifikasi bootstrap
        function showResizeNotification(cols, rows) {
          // Hapus notifikasi lama jika ada
          let old = document.getElementById("term-resize-alert");
          if (old) old.remove();
          const alert = document.createElement("div");
          alert.id = "term-resize-alert";
          alert.className = "alert alert-info fade show position-absolute";
          alert.style.zIndex = 1000;
          alert.style.top = "50%";
          alert.style.left = "50%";
          alert.style.transform = "translate(-50%, -50%)";
          alert.style.textAlign = "center";
          alert.style.minWidth = "120px";
          alert.style.fontWeight = "bold";
          alert.innerHTML = `[${cols}:${rows}]`;
          // Masukkan ke parent terminal
          const parent =
            document.getElementById(
              `main-content-${app.header.appName}-${app.header.uuid}`
            )?.parentElement || document.body;
          parent.appendChild(alert);
          setTimeout(() => {
            alert.classList.remove("show");
            alert.classList.add("fade");
            setTimeout(() => alert.remove(), 500);
          }, 1000);
        }

        term.onResize(({ cols, rows }) => {
          console.log(`client side resize ${cols}x${rows}`);
          RFC.callRFC(
            "desktop.webshell.shellResize",
            [cols, rows],
            (ret) => { }
          );
          showResizeNotification(cols, rows);
        });

        term.onData((e) => {
          if (e == "\u0006") {
            //Ctrl+F
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

        const mainDiv = document.getElementById(
          `main-content-${app.header.appName}-${app.header.uuid}`
        );
        term.open(mainDiv);
        fitAddon.fit();
        // Responsive saat window resize
        window.addEventListener("resize", () => fitAddon.fit());
        // Jika parent div bisa berubah size karena layout, bisa juga observer
        const resizeObserver = new window.ResizeObserver(() => fitAddon.fit());
        resizeObserver.observe(mainDiv);

        RFC.callRFC("desktop.terminalReady", [], (ret) => { });

        // --- CRT Retro Styling with Custom Frame ---
        // Tambahkan konfigurasi skema warna
        const colorSchema = 0; // 0 = green, 1 = brown (amber)
        // Definisi skema warna
        const colorThemes = [
          {
            // Green screen
            frameImage: "images/retro-crt.jpg",
            textColor: "#bfffbf",
            cursorBg: "#bfffbf",
            cursorShadow: "#7fff7f",
            textShadow: `0 0 2px #4fff4f, 0 0 2px #30ff30, 0 0 6px #30ff30`,
            scanline: "rgba(64,64,64,0.1)",
            scanline2: "rgba(64,64,64,0.15)",
            scanline3: "rgba(64,64,64,0.1)",
            scanlineOpacity: 0.35,
            scanlineFine: "",
            // "repeating-linear-gradient(to bottom, rgba(0,255,64,0.07) 0px, transparent 1px, transparent 2px)",
            afterBg:
              "radial-gradient(ellipse at center, rgba(0,255,1,0.15) 0%, rgba(0,0,0,0.5) 100%)",
            flickerDelay: "0.25s",
            flickerFlavour:
              `@keyframes crt-flicker {
              0%, 100% { opacity: 1; filter: brightness(1); }
              10% { opacity: 0.98; filter: brightness(0.96); }
              20% { opacity: 0.99; filter: brightness(1.1); }
              30% { opacity: 1; filter: brightness(1.0); }
              40% { opacity: 1.1; filter: brightness(1.1); }
              50% { opacity: 0.9; filter: brightness(.96); }
              60% { opacity: 1; filter: brightness(1.1); }
              70% { opacity: 1.1; filter: brightness(1.05); }
              80% { opacity: 1; filter: brightness(1); }
              90% { opacity: 0.98; filter: brightness(1.1); }
            }`,
          },
          {
            // Brown/Amber screen (VT320 style)
            frameImage: "images/retro-crt.jpg",
            textColor: "#ffa0a0", // #ffa020
            cursorBg: "#ffa020",
            cursorShadow: "#ffa020",
            textShadow: `0 0 2px #df9020, 0 0 2px #df9020, 0 0 6px #df9020`,
            scanline: "rgba(64,64,64,0.1)",
            scanline2: "rgba(64,64,64,0.15)",
            scanline3: "rgba(64,64,64,0.1)",
            scanlineOpacity: 0.35,
            scanlineFine: "",
            // "repeating-linear-gradient(to bottom, rgba(255,200,64,0.09) 0px, transparent 2px, transparent 4px)",
            afterBg:
              "radial-gradient(ellipse at center, rgba(255,100,64,0.15) 0%, rgba(0,0,0,0.5) 100%)",
            flickerDelay: "0.001s",
            flickerFlavour:
              `@keyframes crt-flicker {
              0%, 100% { opacity: 1; filter: brightness(1.0); }
              10% { opacity: 1; filter: brightness(1.1); }
              20% { opacity: 0.98; filter: brightness(1.15); }
              30% { opacity: 1; filter: brightness(1.1); }
              40% { opacity: 0.99; filter: brightness(1.1); }
              50% { opacity: 1; filter: brightness(1); }
              60% { opacity: 1; filter: brightness(1.15); }
              70% { opacity: 0.98; filter: brightness(1.05); }
              80% { opacity: 1; filter: brightness(1); }
              90% { opacity: 0.98; filter: brightness(1.1); }
            }`,
          },

        ];
        const theme = colorThemes[colorSchema];
        const crtStyle = document.createElement("style");
        crtStyle.innerHTML = `
          #main-content-${app.header.appName}-${app.header.uuid} {
            background: url('${colorThemes[colorSchema].frameImage}') no-repeat center center;
            background-size: cover;
            position: relative;
            overflow: hidden;
            filter:  brightness(.9) contrast(1.6) saturate(1.3) blur(.7px);
            width: 100%;
            height: 100%;
            border: none;
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          #main-content-${app.header.appName}-${app.header.uuid} .crt-glass-area {
            position: absolute;
            left: 10%;
            top: 5%;
            width: 84%;
            height: 84%;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 20px;
            overflow: hidden;
            background: none;
            z-index: 2;
            opacity: 1;
            transform: scale(0.83);
            transform-origin: center center;
          }
          #main-content-${app.header.appName}-${app.header.uuid} .xterm {
            width: 100%;
            height: 100%;            
            color: ${theme.textColor};
            font-family: 'Fira Code', 'VT323', 'IBM Plex Mono', 'Fira Mono', 'Menlo', 'Consolas', 'monospace';
            font-size: 1.1em;
            text-shadow: ${theme.textShadow};
            animation: crt-flicker ${theme.flickerDelay} infinite alternate;
            z-index: 3;
          }
          #main-content-${app.header.appName}-${app.header.uuid} .xterm-cursor {
            background: ${theme.cursorBg} !important;
            box-shadow: 0 0 8px ${theme.cursorShadow};
          }
          #main-content-${app.header.appName}-${app.header.uuid} .xterm-viewport {
          
            background: transparent !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          #main-content-${app.header.appName}-${app.header.uuid} .xterm-viewport::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            background: transparent !important;
          }
          #main-content-${app.header.appName}-${app.header.uuid} .xterm-rows {
          color: ${theme.textColor};
            line-height: 0px;
            background: transparent !important;
            background-image: repeating-linear-gradient(
              to bottom,
              ${theme.textColor}11 0px,
              ${theme.textColor}11 1px,
              transparent 1.5px,
              transparent 3px
            );
            mix-blend-mode: lighten;
          }
          #main-content-${app.header.appName}-${app.header.uuid}::after {
            content: '';
            pointer-events: none;
            position: absolute;
            left: 0; top: 0; right: 0; bottom: 0;
            background: ${theme.afterBg};
            z-index: 3;
          }
          #main-content-${app.header.appName}-${app.header.uuid} .crt-scanline {
            pointer-events: none;
            position: absolute;
            left: 0; right: 0;
            height: 64px;            
            background: linear-gradient(
              to bottom,
              ${theme.scanline} 15%,
              ${theme.scanline2} 40%,
              ${theme.scanline3} 80%
            );
            opacity: ${theme.scanlineOpacity};
            z-index: 10;
            animation: crt-scanline-move 5s linear infinite;
          }
          ${theme.flickerFlavour}
          @keyframes crt-scanline-move {
            0% { top: 0%; }
            100% { top: 100%; }
          }
        `;
        document.head.appendChild(crtStyle);
        // Add scanline element
        const scanline = document.createElement("div");
        scanline.className = "crt-scanline";
        scanline.style.width = "100%";
        scanline.style.position = "absolute";
        scanline.style.pointerEvents = "none";
        scanline.style.zIndex = 10;
        // --- Tambahan: Fine scanlines overlay ---
        const fineScanlines = document.createElement("div");
        fineScanlines.className = "crt-scanlines-fine";
        fineScanlines.style.width = "100%";
        fineScanlines.style.height = "100%";
        fineScanlines.style.position = "absolute";
        fineScanlines.style.left = "0";
        fineScanlines.style.top = "0";
        fineScanlines.style.pointerEvents = "none";
        fineScanlines.style.zIndex = 9;
        fineScanlines.style.backgroundImage = theme.scanlineFine;
        // Add glass overlay
        const glass = document.createElement("div");
        glass.className = "crt-glass";
        // Wrap terminal in glass-area for correct positioning
        let glassArea = document.createElement("div");
        glassArea.className = "crt-glass-area";
        // Move .xterm into glassArea after term.open(mainDiv)
        if (mainDiv) {
          mainDiv.appendChild(glassArea);
          glassArea.appendChild(fineScanlines); // Tambahkan fine scanlines
          glassArea.appendChild(scanline);
          glassArea.appendChild(glass);
          // Move .xterm node into glassArea
          const xtermNode = mainDiv.querySelector(".xterm");
          if (xtermNode) glassArea.appendChild(xtermNode);
        }
        // --- END CRT Retro Styling ---
      },
    };
    return appContent;
  },
};
