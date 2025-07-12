module.exports = {
  application: () => {
    let appName = "_ndabout";
    let appTitle = "NOS Desktop";

    return {
      header: {
        appId: "787",
        appName,
        appTitle,
        active: true,
        iconSmall: "icon_16_app.png",
        iconMedium: "icon_22_app.png",
        iconLarge: "icon_32_app.png",
        width: 500,
        height: 540,
        resizable: true,
      },
      content: `<div id="main-content-${appName}" class="p-6 bg-gray rounded-lg shadow-md max-w-xl mx-auto">
        <div style="padding-left: 20px;">

          <div style="overflow: hidden; margin-bottom: 2rem;">
            <div style="float: left; line-height: 1.5;">
              <h2 style="margin: 0; padding-top:30px;font-size: 1.5rem; font-weight: bold; color: #333;">NOS Desktop</h2>
              <div style="font-size: 0.85rem; color: #666; padding-top:10px;">
                Ochroma Pyramidale v1.1<br/>
                NOS © 2025 by K1ngUn1c0rn🦄
              </div>
            </div>
            <div style="float: right;padding-right:40px;">
              <img src="images/nos.png" alt="NOS Logo" style="" />
            </div>
          </div>


          <p class="text-gray-700 mb-2">
            <strong>NOS Desktop</strong> uses the following open-source libraries:
          </p>

          <ul class="list-disc list-inside text-gray-700 mb-4 space-y-1">
            <li><a href="https://jquery.com/" class="text-blue-600 hover:underline" target="_blank">jQuery</a></li>
            <li><a href="https://www.jeasyui.com/" class="text-blue-600 hover:underline" target="_blank">jQuery Easy UI</a></li>
            <li><a href="https://www.chartjs.org/" class="text-blue-600 hover:underline" target="_blank">Chart.js</a></li>
            <li><a href="https://kimmobrunfeldt.github.io/progressbar.js/" class="text-blue-600 hover:underline" target="_blank">ProgressBar.js</a></li>
            <li><a href="https://xtermjs.org/" class="text-blue-600 hover:underline" target="_blank">Xterm.js</a></li>
            <li><a href="https://www.tiny.cloud/" class="text-blue-600 hover:underline" target="_blank">TinyMCE</a></li>
            <li><a href="https://codemirror.net/" class="text-blue-600 hover:underline" target="_blank">Codemirror</a></li>
            <li><a href="https://getbootstrap.com/" class="text-blue-600 hover:underline" target="_blank">Bootstrap</a></li>
          </ul>

          <p class="text-sm text-gray-500">
            All trademarks are the property of their respective owners.
          </p>
          <div id="nos-watermark"></div>
        </div>

        <div class="text-center">
          <button id="btn1" class="btn btn-primary">
            OK
          </button>
        </div>
      </div>`,
      main: (sender, nos) => {
        // Optional backend logic (NOS side)
        // sender.crt.textOut("[NOS App] " + appTitle + " started.\n");
      },
      jsContent: (app) => {
        // Frontend logic (browser side)
        const div = document.getElementById(
          "main-content-" + app.header.appName
        );
        // if (div) div.innerHTML += "<br/><i>JS loaded successfully.</i>";
        $("#btn1").click(() => {
          $(`#${app.header.appId}`).window("close");
        });
      },
    };
  },
};
