module.exports.application = () => {
  const appName = "chaosbifur";
  const appTitle = "Logistic Chaos & Bifurkasi";

  return {
    header: {
      appName,
      appTitle,
      active: true,
      iconSmall: "icon_16_chart.png",
      iconMedium: "icon_22_chart.png",
      iconLarge: "icon_32_chart.png",
      width: 700,
      height: 440
    },
    content: `
      <div class="p-2 text-sm">
        r: <input id="r-${appName}" type="number" step="0.01" value="3.9" min="2" max="4" style="width:60px"/>
        x₀: <input id="x0-${appName}" type="number" step="0.01" value="0.5" min="0" max="1" style="width:60px"/>
        <button id="run-${appName}">Jalankan</button>
        <button id="bifur-${appName}">Plot Bifurkasi</button>
      </div>
      <canvas id="canvas-${appName}" width="660" height="320" style="border:1px solid #444;margin:10px;"></canvas>
    `,
    main: () => { },
    jsContent: (app) => {
      setTimeout(() => {
        const rInput = document.getElementById(`r-${app.header.appName}`);
        const x0Input = document.getElementById(`x0-${app.header.appName}`);
        const canvas = document.getElementById(`canvas-${app.header.appName}`);
        const ctx = canvas.getContext("2d");
        const btnRun = document.getElementById(`run-${app.header.appName}`);
        const btnBifur = document.getElementById(`bifur-${app.header.appName}`);

        // Tombol Jalankan Grafik X vs Iterasi
        btnRun.addEventListener("click", () => {
          const r = parseFloat(rInput.value);
          let x = parseFloat(x0Input.value);
          const steps = 100;
          const points = [];

          for (let i = 0; i < steps; i++) {
            x = r * x * (1 - x);
            points.push(x);
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = "#008000";
          ctx.beginPath();
          for (let i = 0; i < steps; i++) {
            const px = 30 + i * 6;
            const py = 300 - points[i] * 280;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        });

        // Tombol Bifurkasi Diagram Mini
        btnBifur.addEventListener("click", () => {
          const x0 = parseFloat(x0Input.value);
          const minR = 2.5, maxR = 4.0;
          const width = canvas.width;
          const height = canvas.height;

          ctx.clearRect(0, 0, width, height);

          for (let px = 0; px < width; px++) {
            const r = minR + (px / width) * (maxR - minR);
            let x = x0;

            // Skip iterasi awal (biar stabil dulu)
            for (let i = 0; i < 100; i++) {
              x = r * x * (1 - x);
            }

            // Plot 50 nilai terakhir
            for (let i = 0; i < 50; i++) {
              x = r * x * (1 - x);
              const py = height - x * height;
              ctx.fillStyle = "#008000";
              ctx.fillRect(px, py, 1, 1);
            }
          }
        });
      }, 0);
    }
  };
};
