module.exports = {
  author: "Canding",
  description: "Generator app GUI NOS Desktop (SDK v1)",
  version: "1.1",
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);
    let outFileName = "";
    let outAppName = "";
    let outAppTitle = "";

    if (args.params && args.params.o) {
      outFileName = args.params.o;
    }
    if (args.params && args.params.n) {
      outAppName = args.params.n;
    }
    if (args.params && args.params.t) {
      outAppTitle = args.params.t;
    }

    if (outFileName == "" || outAppName == "" || outAppTitle == "") {
      this.crt.textOut("❌ Usage: create-app.js -n <App Name> -t <App Title> -o <filename> \n");
      this.terminate();
      return;
    }

    if (!outFileName.endsWith(".js")) outFileName += ".js";

    const appName = outAppName;
    const appTitle = outAppTitle;
    const filePath = `/opt/gui/apps/${outFileName}`;

    // Template isi file
    const fileContent = `
      module.exports = {
        application: (uuid) => {
        let appName = "${appName}";
        let appTitle = "${appTitle}";

        return {
          header: {
            appName,
            appTitle,
            version: "1.0",
            uuid,
            active: true,
            iconSmall: "icon_16_app.png",
            iconMedium: "icon_22_app.png",
            iconLarge: "icon_32_app.png",
            resizable: true,
            width: 500,
            height: 400
          },
          content: \`
          	<style type="text/css">
            	.main-container {
              	padding: 10px;
              }
            </style>
            <div class="main-container" data-app="\${appName}" data-uuid="\${uuid}">

            </div>\`,
          main: (sender, nos) => {
            // Optional backend logic (NOS side)
          },
          jsContent: (app) => {
            // Frontend logic (browser side)
            const parentSelector = \`.main-container[data-uuid="\${app.header.uuid}"]\`;
            const targetDiv = document.querySelector(parentSelector);
            targetDiv.textContent = "Hello world";
          }
        };
      }
    };`;

    try {
      fs.writeFileSync(filePath, fileContent);
      this.crt.textOut(`✅ App '${appName}' created at: ${filePath}\n`);
      this.shell.terminate();
    } catch (err) {
      this.crt.textOut(`❌ Error creating app: ${err}\n`);
    }
  }
};
