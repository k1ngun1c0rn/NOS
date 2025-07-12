module.exports = {
  application: (uuid) => {
    let appName = "allsensor";
    let appTitle = "All Sensor";

    return {
      header: {
        appName,
        appTitle,
        uuid,
        active: true,
        iconSmall: "icon_16_chart.png",
        iconMedium: "icon_22_chart.png",
        iconLarge: "icon_32_chart.png",
        resizable: true,
      },
      content: `
        <style>
          .chart-container[data-uuid="${uuid}"] {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 20px;
          }
          .chart-box {
            width: 100%;
            height: 270px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .chart-box canvas {
            width: 80%;
            height: 80%;
          }
          .alert-nos {
            margin: 20px 0 0 0;
          }
        </style>
        <div class="nos-alert alert-nos" data-app="${appName}" data-uuid="${uuid}"></div>
        <div class="chart-container" data-app="${appName}" data-uuid="${uuid}">
          <div class="chart-box">
              <canvas data-chart="chart1" data-chart-title="Temperature"></canvas>
          </div>
          <div class="chart-box">
              <canvas data-chart="chart2" data-chart-title="Humidity"></canvas>
          </div>
          <div class="chart-box">
              <canvas data-chart="chart3" data-chart-title="Light Intensity"></canvas>
          </div>
          <div class="chart-box">
              <canvas data-chart="chart4" data-chart-title="Soil Moisture"></canvas>
          </div>
        </div>
      `,
      main: () => { },
      jsContent: (app) => {
        const MAX_POINTS = 15;
        const charts = {};
        const root = document.querySelector(
          `.chart-container[data-uuid="${app.header.uuid}"]`
        );

        root.querySelectorAll("[data-chart]").forEach((canvas) => {
          const chartId = canvas.getAttribute("data-chart");
          const chartTitle = canvas.getAttribute("data-chart-title") || "Unknown";
          let borderColor;
          switch (chartId) {
            case "chart1": borderColor = "#FF6384"; break;
            case "chart2": borderColor = "#36A2EB"; break;
            case "chart3": borderColor = "#FFCE56"; break;
            case "chart4": borderColor = "#4BC0C0"; break;
            default: borderColor = "#888888"; break;
          }
          const ctx = canvas.getContext("2d");
          charts[chartId] = new Chart(ctx, {
            type: "line",
            data: {
              labels: Array(MAX_POINTS).fill(""),
              datasets: [{
                label: chartTitle,
                data: Array(MAX_POINTS).fill(null),
                fill: false,
                borderColor: borderColor,
                tension: 0.4,
              }],
            },
            options: {
              responsive: true,
              animation: false,
              plugins: {
                legend: { display: false },
                title: { display: true, text: chartTitle },
              },
              scales: {
                x: { title: { display: true, text: "Time" } },
                y: { min: 0, max: 100, title: { display: true, text: "Value" } },
              },
            },
          });
        });

        const idMap = {
          "01": "chart1",
          "02": "chart2",
          "03": "chart3",
          "04": "chart4",
        };

        function updateChartsFromDataString(dataString) {
          if (dataString && typeof dataString === "string") {
            const readings = dataString.split(";");
            readings.forEach((reading) => {
              const parts = reading.split("=");
              if (parts.length === 2) {
                const sensorId = parts[0];
                const sensorValue = parseFloat(parts[1]);
                const chartId = idMap[sensorId];
                if (charts[chartId]) {
                  const ts = new Date().toLocaleTimeString();
                  charts[chartId].data.labels.push(ts);
                  charts[chartId].data.datasets[0].data.push(sensorValue);
                  if (charts[chartId].data.labels.length > MAX_POINTS) {
                    charts[chartId].data.labels.shift();
                    charts[chartId].data.datasets[0].data.shift();
                  }
                  charts[chartId].update();
                }
              }
            });
          }
        }

        let ws, RFC;

        function showBootstrapWarning(msg) {
          const alertDiv = document.querySelector(`.nos-alert[data-uuid="${app.header.uuid}"]`);
          if (alertDiv) {
            alertDiv.innerHTML = `
        <div class="alert alert-warning alert-nos" role="alert">
          <b>Warning:</b> ${msg}
        </div>
      `;
          }
        }

        function clearBootstrapWarning() {
          const alertDiv = document.querySelector(`.nos-alert[data-uuid="${app.header.uuid}"]`);
          if (alertDiv) alertDiv.innerHTML = "";
        }

        function connect() {
          let srcaddress = "ws://localhost:8090";
          ws = new WebSocket(srcaddress);

          ws.onopen = function () {
            RFC = new cygRFC(ws);
            RFC.callRFC("nto.getList", [], function (list) {
              if (!list || !Array.isArray(list)) {
                //alert("NTO Service belum aktif di server. Silakan jalankan service sensor terlebih dahulu.");
                // Atau tampilkan warning di UI
                showBootstrapWarning("NTO Service belum aktif di server. Silakan jalankan service sensor terlebih dahulu.");
                return;
              }
              clearBootstrapWarning();
              // Register sensor listener agar dapat push update dari server
              RFC.callRFC("nto.registerSensorListener", [app.header.uuid]);

              // RFC Listener untuk push update sensor sesuai UUID
              RFC.registerListener(`ngs/${app.header.uuid}`, (data) => {
                if (data && data.type === "sensorUpdate" && data.payload) {
                  updateChartsFromDataString(data.payload);
                }
              });
            });
          };

          ws.onclose = function (e) {
            console.log("Socket closed. Retry in 1s.", e.reason);
            setTimeout(connect, 1000);
          };

          ws.onerror = function (err) {
            console.error("WebSocket error: ", err.message);
            ws.close();
          };
        }

        $(document).ready(() => {
          connect();
        });

        // Simpan chart global biar bisa dipanggil dari luar
        window[app.header.uuid] = { charts };
      },
    };
  },
};