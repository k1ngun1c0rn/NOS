module.exports = {
  application: () => {
    let appName = "esp32dashboard";
    let appTitle = "ESP32 Sensor";
    let appContent = {
      header: {
        appName: appName,
        appTitle: appTitle,
        active: true,
        iconSmall: "icon_16_chart.png",
        iconMedium: "icon_22_chart.png",
        iconLarge: "icon_32_chart.png",
        width: 700,
        height: 450,
      },
      content: `<div id="main-content-${appName}">
      <div class="flex flex-col gap-2 h-full" style="width: 100%;height:100%;">
            <div class="flex gap-2 items-center" style="padding-top: 10px; padding-left: 20px; padding-right: 20px">            
      <select class="form-select" id="sensorIdSelect"></select>
      </div>
      </div>
      <canvas id="myChart"></canvas></div>`,
      main: () => { },
      jsContent: (app) => {
        const ctx = document.getElementById("myChart").getContext("2d");

        const MAX_POINTS = 15;

        window.chart = new Chart(ctx, {
          type: "line",
          data: {
            labels: Array(MAX_POINTS).fill(""),
            datasets: [
              {
                label: "Live Data",
                data: Array(MAX_POINTS).fill(null),
                fill: false,
                borderColor: "#4bc0c0",
                tension: 0.4,
              },
            ],
          },
          options: {
            responsive: true,
            animation: false,
            plugins: {
              title: {
                display: false,
                text: "ESP32 Sensor Monitor",
              },
            },
            scales: {
              x: { title: { display: true, text: "Time" } },
              y: { min: 0, max: 100, title: { display: true, text: "Value" } },
            },
          },
        });

        function connect() {
          let srcaddress = "ws://localhost:8080";
          ws = new WebSocket(srcaddress);
          ws.onopen = function () {
            window.RFCSensor = new cygRFC(ws);
            RFCSensor.callRFC = (name, params = [], callBack = {}) => {
              RFCSensor.remoteCall(
                {
                  name: name,
                  params: params,
                },
                callBack
              );
            };

            //createChart();
            populateSensorList();

            setInterval(() => {
              if (sensorId) {
                // console.log("xxx " + sensorId);
                updateChart(sensorId);
              }
            }, 2000);
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
        function populateSensorList() {
          RFCSensor.callRFC("nto.getList", [], (list) => {
            if (!list || !Array.isArray(list)) return;
            const select = $("#sensorIdSelect");
            select.empty();
            list.forEach((item) => {
              select.append(
                `<option value="${item.id}">${item.id} - ${item.name}</option>`
              );
            });
            sensorId = select.val(); // ambil sensor pertama sebagai default
          });
        }
        function updateChart(id) {
          RFCSensor.callRFC("nto.getData", [id], (res) => {
            try {
              // console.log("Incoming getData: "+JSON.stringify(res));
              let data = res;
              if (data.value != null) {
                const ts = new Date(data.timeStamp).toLocaleTimeString();
                const val = parseFloat(data.value);

                // Geser data dan label ke kiri
                chart.data.datasets[0].data.push(val);
                chart.data.labels.push(ts);

                if (chart.data.labels.length > 20) {
                  chart.data.labels.shift();
                  chart.data.datasets[0].data.shift();
                }
                chart.update();
              }
            } catch (e) {
              console.log(e);
            }
          });
        }

        $(this).ready(() => {
          sensorId = 0;
          connect();

          $("#sensorIdSelect").on("change", function () {
            sensorId = $(this).val();
            console.log(sensorId);
            chart.data.labels = Array(MAX_POINTS).fill("");
            chart.data.datasets[0].data = Array(MAX_POINTS).fill(null);
            chart.update();
          });
        });
      },
    };
    return appContent;
  },
};
