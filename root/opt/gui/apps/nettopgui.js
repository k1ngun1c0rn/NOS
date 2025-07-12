module.exports = {
  application: () => {
    let appName = "nettop";
    let appTitle = "MQTNL Network Monitor";

    return {
      header: {
        appName,
        appTitle,
        active: true,
        iconSmall: "icon_16_network.png",
        iconMedium: "icon_22_network.png",
        iconLarge: "icon_32_network.png",
        width: 600,
        height: 550,
      },
      content: `
        <div id="main-content-${appName}" class="p-4">
          <!--<h2 class="text-xl font-semibold mb-4">📡 NOS Network Traffic</h2>-->
          <table class="w-full text-sm text-left border border-gray-300 mb-4" id="trafficTable-${appName}">
            <thead class="bg-gray-200">
              <tr>
                <th class="px-2 py-1">Device</th>
                <th class="px-2 py-1">Total Tx (KB)</th>
                <th class="px-2 py-1">Tx Rate (KB/s)</th>
                <th class="px-2 py-1">Total Rx (KB)</th>
                <th class="px-2 py-1">Rx Rate (KB/s)</th>
              </tr>
            </thead>
            <tbody id="trafficBody-${appName}">
              <tr><td colspan="5" class="text-center py-2">⏳ Loading...</td></tr>
            </tbody>
          </table>
          <canvas id="mainChart-${appName}" width="550" height="320"></canvas>
        </div>
      `,
      main: (sender, nos) => {
        sender.ws.remoteFunction.system = {};
        sender.ws.remoteFunction.system.listDevices = () => {
          return Object.entries(nos.devices).map(([name, dev]) => ({
            name: dev.name,
            devClass: dev.devClass || "",
            hasStats: typeof dev.connMgr?.getStats === "function"
          }));
        };
        sender.ws.remoteFunction.dev = new Proxy({}, {
          get: (_, devName) => {
            return {
              getStats: () => {
                try {
                  const dev = nos.getDevice(devName);
                  if (!dev || !dev.connMgr || typeof dev.connMgr.getStats !== "function")
                    return { error: "No stats available" };
                  return dev.connMgr.getStats();
                } catch (e) {
                  return { error: e.message };
                }
              }
            };
          }
        });
      },
      jsContent: (app) => {
        const tableBody = document.getElementById(`trafficBody-${app.header.appName}`);
        const mainChartCanvas = document.getElementById(`mainChart-${app.header.appName}`);
        const mainChartCtx = mainChartCanvas.getContext('2d');
        let mainChart;
        // const chartColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", "#E7E9ED", "#8B008B", "#008080"];
        const chartColors = [
          "#e6194B", // Red
          "#3cb44b", // Green
          "#ffe119", // Yellow
          "#4363d8", // Blue
          "#f58231", // Orange
          "#911eb4", // Purple
          "#42d4f4", // Cyan
          "#f032e6", // Magenta
          "#bfef45", // Lime
          "#fabed4", // Pink
          "#469990", // Teal
          "#dcbeff", // Lavender
          "#9A6324", // Brown
          "#fffac8", // Beige
          "#800000", // Maroon
          "#aaffc3", // Mint
          "#808000", // Olive
          "#ffd8b1", // Apricot
          "#000075", // Navy
          "#808080", // Gray
        ];
        const MAX_POINTS = 20;

        function createMultiSeriesChart(labels = [], datasets = []) {
          return new Chart(mainChartCtx, {
            type: "line",
            data: {
              labels: labels,
              datasets: datasets,
            },
            options: {
              responsive: true,
              animation: false,
              scales: {
                x: { title: { display: true, text: 'Time' } },
                y: { min: 0, title: { display: true, text: 'Rate (KB/s)' } },
              },
            },
          });
        }

        function refreshStats() {
          RFC.callRFC("system.listDevices", [], (devs) => {
            if (!Array.isArray(devs)) return;
            const connMgrs = devs.filter(d => d.devClass?.includes("Connection Manager"));
            const rows = [];
            const labels = mainChart?.data?.labels?.slice() || [];
            const datasets = [];
            const now = new Date().toLocaleTimeString();
            if (labels.length < MAX_POINTS) labels.push(now);
            else {
              labels.shift();
              labels.push(now);
            }
            let colorIndex = 0;
            Promise.all(connMgrs.map((dev, index) => {
              return new Promise(resolve => {
                RFC.callRFC(`dev.${dev.name}.getStats`, [], (stats) => {
                  const txKB = ((stats.totalTx || 0) / 1024).toFixed(2);
                  const rxKB = ((stats.totalRx || 0) / 1024).toFixed(2);
                  const txRate = parseFloat(stats.txKBps || 0);
                  const rxRate = parseFloat(stats.rxKBps || 0);
                  // const a = dev.name;
                  // const colorIndex = isNaN(parseInt(a.substring(a.length - 1))) ? 0 : parseInt(a.substring(a.length - 1));

                  datasets.push({
                    label: `${dev.name} Tx`,
                    data: (mainChart?.data?.datasets?.find(d => d.label === `${dev.name} Tx`)?.data?.slice() || []).concat([txRate]).slice(-MAX_POINTS),
                    borderColor: chartColors[colorIndex],
                    fill: false,
                    tension: 0.3,
                  });
                  colorIndex++;
                  datasets.push({
                    label: `${dev.name} Rx`,
                    data: (mainChart?.data?.datasets?.find(d => d.label === `${dev.name} Rx`)?.data?.slice() || []).concat([rxRate]).slice(-MAX_POINTS),
                    borderColor: chartColors[(colorIndex)],
                    fill: false,
                    tension: 0.3,
                  });
                  colorIndex++;
                  rows.push(`
                    <tr>
                      <td class="px-2 py-1 font-mono">${dev.name}</td>
                      <td class="px-2 py-1 text-right">${txKB}</td>
                      <td class="px-2 py-1 text-right">${txRate}</td>
                      <td class="px-2 py-1 text-right">${rxKB}</td>
                      <td class="px-2 py-1 text-right">${rxRate}</td>
                    </tr>
                  `);
                  resolve();
                });
              });
            })).then(() => {
              tableBody.innerHTML = rows.join("");
              if (!mainChart) {
                mainChart = createMultiSeriesChart(labels, datasets);
              } else {
                mainChart.data.labels = labels;
                mainChart.data.datasets = datasets;
                mainChart.update();
              }
            });
          });
        }

        function initChartWithEmptyData() {
          RFC.callRFC("system.listDevices", [], (devs) => {
            if (!Array.isArray(devs)) return;
            const connMgrs = devs.filter(d => d.devClass?.includes("Connection Manager"));
            const initialDatasets = [];
            connMgrs.forEach((dev, index) => {
              const colorIndex = index % chartColors.length;
              initialDatasets.push({
                label: `${dev.name} Tx`,
                data: [],
                borderColor: chartColors[colorIndex],
                fill: false,
                tension: 0.3,
              });
              initialDatasets.push({
                label: `${dev.name} Rx`,
                data: [],
                borderColor: chartColors[(colorIndex + 1) % chartColors.length],
                fill: false,
                tension: 0.3,
              });
            });
            mainChart = createMultiSeriesChart([], initialDatasets);
          });
        }

        $(this).ready(() => {
          initChartWithEmptyData();
          setInterval(refreshStats, 1000);
        });
      },
    };
  },
};




// module.exports = {
//   application: () => {
//     let appName = "nettop";
//     let appTitle = "NOS Network Monitor";

//     return {
//       header: {
//         appName,
//         appTitle,
//         active: true,
//         iconSmall: "icon_16_network.png",
//         iconMedium: "icon_22_network.png",
//         iconLarge: "icon_32_network.png",
//         width: 530,
//         height: 600,
//       },
//       content: `
//         <div id="main-content-${appName}" class="p-4">
//           <h2 class="text-xl font-semibold mb-4">📡 NOS Network Traffic</h2>
//           <table class="w-full text-sm text-left border border-gray-300" id="trafficTable-${appName}">
//             <thead class="bg-gray-200">
//               <tr>
//                 <th class="px-2 py-1">Device</th>
//                 <th class="px-2 py-1">Total Tx (KB)</th>
//                 <th class="px-2 py-1">Tx Rate (KB/s)</th>
//                 <th class="px-2 py-1">Total Rx (KB)</th>
//                 <th class="px-2 py-1">Rx Rate (KB/s)</th>
//               </tr>
//             </thead>
//             <tbody id="trafficBody-${appName}">
//               <tr><td colspan="5" class="text-center py-2">⏳ Loading...</td></tr>
//             </tbody>            
//           </table>
//           <canvas id="mainChart-${appName}" width="400" height="250"></canvas>
//         </div>
//       `,
//       main: (sender, nos) => {
//         sender.ws.remoteFunction.system = {}; // Namespace system
//         // system.listDevices: balikin info device
//         sender.ws.remoteFunction.system.listDevices = () => {
//           // console.log("hello");
//           // return "Hello world"

//           return Object.entries(nos.devices).map(([name, dev]) => {
//             return {
//               name: dev.name,
//               devClass: dev.devClass || "",
//               hasStats: typeof dev.connMgr?.getStats === "function"
//             };
//           });
//         };
//         // dev.xxx.getStats: panggil dev.connMgr.getStats() jika ada
//         sender.ws.remoteFunction.dev = new Proxy({}, {
//           get: (_, devName) => {
//             return {
//               getStats: () => {
//                 try {
//                   // const dev = nos.devices[devName];
//                   // console.log("$$$ " + devName)
//                   const dev = nos.getDevice(devName);
//                   if (!dev || !dev.connMgr || typeof dev.connMgr.getStats !== "function")
//                     return { error: "No stats available" };
//                   return dev.connMgr.getStats();
//                 } catch (e) {
//                   return { error: e.message };
//                 }
//               }
//             };
//           }
//         });
//       },
//       jsContent: (app) => {
//         // let ws, RFCSensor;
//         const tableBody = document.getElementById(`trafficBody-${app.header.appName}`);

//         const mainChartCanvas = document.getElementById(`mainChart-${app.header.appName}`);
//         const mainChartCtx = mainChartCanvas.getContext('2d');
//         let mainChart;
//         const chartColors = ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"];
//         const MAX_POINTS = 20;

//         function createMultiSeriesChart(labels = [], datasets = []) {
//           return new Chart(mainChartCtx, {
//             type: "line",
//             data: {
//               labels: [],
//               datasets: [
//                 {
//                   label: "TX Rate",
//                   data: [],
//                   borderColor: "#Eb80c0",
//                   fill: false,
//                   tension: 0.3,
//                 },
//                 {
//                   label: "RX Rate",
//                   data: [],
//                   borderColor: "#4bc0c0",
//                   fill: false,
//                   tension: 0.3,
//                 },
//               ],
//             },
//             options: {
//               responsive: true,
//               animation: false,
//               scales: {
//                 x: { title: { display: true, text: 'Time' } },
//                 y: { min: 0, title: { display: true, text: 'Rate (KB/s)' } },
//               }
//             }
//           });
//         }

//         function refreshStats() {
//           RFC.callRFC("system.listDevices", [], (devs) => {
//             if (!Array.isArray(devs)) return;
//             const connMgrs = devs.filter(d => d.devClass?.includes("Connection Manager"));
//             //connMgrs = [{ "name": "comm", "devClass": "Connection Manager", "hasStats": true }, { "name": "comm1", "devClass": "Connection Manager (ESP32)", "hasStats": true }, { "name": "comm2", "devClass": "Connection Manager for AES256", "hasStats": true }]

//             const rows = [];

//             // Gunakan indeks manual + rekursi biar tetap async-safe
//             let i = 0;
//             function next() {
//               if (i >= connMgrs.length) {
//                 tableBody.innerHTML = rows.join("");
//                 return;
//               }

//               const dev = connMgrs[i++];
//               RFC.callRFC("dev." + dev.name + ".getStats", [], (stats) => {
//                 const txKB = ((stats.totalTx || 0) / 1024).toFixed(2);
//                 const rxKB = ((stats.totalRx || 0) / 1024).toFixed(2);
//                 const txRate = stats.txKBps || "0.00";
//                 const rxRate = stats.rxKBps || "0.00";

//                 rows.push(`
//                   <tr>
//                     <td class="px-2 py-1 font-mono">${dev.name}</td>
//                     <td class="px-2 py-1 text-right">${txKB}</td>
//                     <td class="px-2 py-1 text-right">${txRate}</td>
//                     <td class="px-2 py-1 text-right">${rxKB}</td>
//                     <td class="px-2 py-1 text-right">${rxRate}</td>
//                   </tr>
//                 `);

//                 // if (dev.name === "comm") {
//                 nettopguiChart.data.datasets[0].data.push(txRate);
//                 nettopguiChart.data.datasets[1].data.push(rxRate);

//                 let ts = new Date().toLocaleTimeString();
//                 nettopguiChart.data.labels.push(ts);
//                 if (nettopguiChart.data.labels.length > MAX_POINTS) {
//                   nettopguiChart.data.labels.shift();
//                   nettopguiChart.data.datasets[0].data.shift();
//                   nettopguiChart.data.labels.shift();
//                   nettopguiChart.data.datasets[1].data.shift();
//                 }
//                 nettopguiChart.update();
//                 // }
//                 next();
//               });
//             }

//             next();
//           });
//         }

//         $(this).ready(() => {
//           refreshStats();
//           window.nettopguiChart = createMultiSeriesChart(['aa', 'bb'], [
//             {
//               label: 'Tx Rate',
//               data: [1, 2, 3],
//               borderColor: chartColors[0],
//               backgroundColor: chartColors[0],
//               fill: false,
//             },
//             {
//               label: 'Rx Rate',
//               data: [2, 3, 4],
//               borderColor: chartColors[1],
//               backgroundColor: chartColors[1],
//               fill: false,
//             },
//           ]);
//           setInterval(() => {
//             refreshStats();
//           }, 1000);
//         });
//       },
//     };
//   },
// };
