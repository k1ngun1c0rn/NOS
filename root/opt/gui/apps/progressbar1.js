/**
 * Responsive Gauge Dashboard for ESP32 (4 Sensors)
 * author: Andriansah
 */

module.exports = {
  application: (uuid) => {
    let appName = "progressbar1";
    let appTitle = "ESP32 Gauges";

    return {
      header: {
        appName,
        appTitle,
        uuid,
        active: true,
        iconSmall: "icon_16_chart.png",
        iconMedium: "icon_22_chart.png",
        iconLarge: "icon_32_chart.png",
        width: 600,
        height: 300,
        resizable: true,
      },
      content: `
      <style>
        .main-content[data-uuid="${uuid}"] {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(2, 1fr);
          gap: 20px;
          height: 100%;
          padding: 20px;
          box-sizing: border-box;
        }
        .gauge-container {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
        }
        .progressbar-semicircle {
          width: 80%;
          height: auto;
        }
        .alert-nos {
          margin: 20px 0 0 0;
        }
      </style>
      <div id="nos-alert-${uuid}"></div>
      <div class="main-content" data-app="${appName}" data-uuid="${uuid}">
        <div class="gauge-container" data-gauge-container="temp">
          <span class="progressbar-semicircle" data-gauge="temp"></span>
        </div>
        <div class="gauge-container" data-gauge-container="humid">
          <span class="progressbar-semicircle" data-gauge="humid"></span>
        </div>
        <div class="gauge-container" data-gauge-container="light">
          <span class="progressbar-semicircle" data-gauge="light"></span>
        </div>
        <div class="gauge-container" data-gauge-container="soil">
          <span class="progressbar-semicircle" data-gauge="soil"></span>
        </div>
      </div>
      `,
      main: (sender, nos) => {
        sender.crt.textOut(`[progressbar1] App loaded with UUID: ${uuid || "unknown"}`);
      },
      jsContent: (app) => {
        const MAX_POINTS = 1; // Hanya tampilkan nilai terakhir
        const root = document.querySelector(
          `.main-content[data-uuid="${app.header.uuid}"]`
        );
        const tempElem = root.querySelector('[data-gauge="temp"]');
        const humidElem = root.querySelector('[data-gauge="humid"]');
        const lightElem = root.querySelector('[data-gauge="light"]');
        const soilElem = root.querySelector('[data-gauge="soil"]');

        function createGauge(element, label, colorFrom, colorTo) {
          const bar = new ProgressBar.SemiCircle(element, {
            strokeWidth: 6,
            color: colorFrom,
            trailColor: "#eee",
            trailWidth: 1,
            easing: "easeInOut",
            duration: 400,
            svgStyle: null,
            text: {
              value: "",
              alignToBottom: true,
            },
            from: { color: colorFrom },
            to: { color: colorTo },
            step: (state, bar) => {
              bar.path.setAttribute("stroke", state.color);
              var value = Math.round(bar.value() * 100);
              bar.setText(`${value}<br/>${label}`);
              bar.text.style.color = state.color;
            },
          });
          bar.text.style.fontFamily = '"Raleway", Helvetica, sans-serif';
          bar.text.style.fontSize = "1rem";
          return bar;
        }

        const gaugeTemp = createGauge(tempElem, "Temp", "#ACEA82", "#ED6A5A");
        const gaugeHumid = createGauge(humidElem, "Humid", "#AFEA82", "#36A2EB");
        const gaugeLight = createGauge(lightElem, "Light", "#FFDA6A", "#FFCE56");
        const gaugeSoil = createGauge(soilElem, "Soil", "#77D4FE", "#4BC0C0");

        const gaugeMap = {
          "01": gaugeTemp,
          "02": gaugeHumid,
          "03": gaugeLight,
          "04": gaugeSoil,
        };

        function showBootstrapWarning(msg) {
          const alertDiv = document.getElementById(`nos-alert-${app.header.uuid}`);
          if (alertDiv) {
            alertDiv.innerHTML = `
              <div class="alert alert-warning alert-nos" role="alert">
                <b>Warning:</b> ${msg}
              </div>
            `;
          }
        }

        function clearBootstrapWarning() {
          const alertDiv = document.getElementById(`nos-alert-${app.header.uuid}`);
          if (alertDiv) alertDiv.innerHTML = "";
        }

        function updateGaugesFromDataString(dataString) {
          if (dataString && typeof dataString === "string") {
            const readings = dataString.split(";");
            readings.forEach((reading) => {
              const parts = reading.split("=");
              if (parts.length === 2) {
                const sensorId = parts[0];
                const sensorValue = parseFloat(parts[1]);
                const gauge = gaugeMap[sensorId];
                if (gauge) {
                  gauge.animate(Math.min(1, sensorValue / 100));
                }
              }
            });
          }
        }

        let ws, RFC;

        function connect() {
          let srcaddress = "ws://localhost:8090";
          ws = new WebSocket(srcaddress);

          ws.onopen = function () {
            RFC = new cygRFC(ws);
            RFC.callRFC = (name, params = [], callBack = {}) => {
              RFC.remoteCall({ name, params }, callBack);
            };

            // Cek apakah nto-service.js aktif
            RFC.callRFC("nto.getList", [], function (list) {
              if (!list || !Array.isArray(list)) {
                showBootstrapWarning("NTO Service belum aktif di server. Silakan jalankan service sensor terlebih dahulu.");
                return;
              }
              clearBootstrapWarning();

              // Register sensor listener agar dapat push update dari server
              RFC.callRFC("nto.registerSensorListener", [app.header.uuid]);

              // Listener untuk push update sensor sesuai UUID
              RFC.registerListener(`ngs/${app.header.uuid}`, (data) => {
                if (data && data.type === "sensorUpdate" && data.payload) {
                  updateGaugesFromDataString(data.payload);
                }
              });
            });
          };

          ws.onclose = function (e) {
            showBootstrapWarning("Koneksi ke server terputus. Mencoba ulang...");
            setTimeout(connect, 1000);
          };

          ws.onerror = function (err) {
            showBootstrapWarning("WebSocket error: " + err.message);
            ws.close();
          };
        }

        $(document).ready(() => {
          connect();
        });

        // Simpan gauge global biar bisa dipanggil dari luar
        window[app.header.uuid] = { gaugeTemp, gaugeHumid, gaugeLight, gaugeSoil };
      },
    };
  },
};