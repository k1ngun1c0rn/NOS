module.exports.application = () => {
  const appName = "doublepend";
  const appTitle = "Double Pendulum";

  return {
    header: {
      appName,
      appTitle,
      active: true,
      iconSmall: "icon_16_sync.png",
      iconMedium: "icon_22_sync.png",
      iconLarge: "icon_32_app.png",
      width: 700,
      height: 500
    },
    content: `
      <div class="p-2 text-sm">
        <button id="run-${appName}">Jalankan Simulasi</button>
      </div>
      <canvas id="canvas-${appName}" width="660" height="400" style="border:1px solid #444;"></canvas>
    `,
    main: () => { },
    jsContent: (app) => {
      setTimeout(() => {
        const canvas = document.getElementById(`canvas-${app.header.appName}`);
        const ctx = canvas.getContext("2d");
        const runBtn = document.getElementById(`run-${app.header.appName}`);

        runBtn.addEventListener("click", () => {
          let a1 = Math.PI / 2, a2 = Math.PI / 2;
          let a1_v = 0, a2_v = 0;
          const m1 = 10, m2 = 10;
          const l1 = 100, l2 = 100;
          const g = 1;

          const cx = canvas.width / 2, cy = 80;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          function draw() {
            // rumus fisika double pendulum (Euler approx)
            let num1 = -g * (2 * m1 + m2) * Math.sin(a1);
            let num2 = -m2 * g * Math.sin(a1 - 2 * a2);
            let num3 = -2 * Math.sin(a1 - a2) * m2;
            let num4 = a2_v * a2_v * l2 + a1_v * a1_v * l1 * Math.cos(a1 - a2);
            let den = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
            let a1_a = (num1 + num2 + num3 * num4) / den;

            num1 = 2 * Math.sin(a1 - a2);
            num2 = a1_v * a1_v * l1 * (m1 + m2);
            num3 = g * (m1 + m2) * Math.cos(a1);
            num4 = a2_v * a2_v * l2 * m2 * Math.cos(a1 - a2);
            den = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2));
            let a2_a = (num1 * (num2 + num3 + num4)) / den;

            ctx.fillStyle = "rgba(0,0,0,0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const x1 = cx + l1 * Math.sin(a1);
            const y1 = cy + l1 * Math.cos(a1);
            const x2 = x1 + l2 * Math.sin(a2);
            const y2 = y1 + l2 * Math.cos(a2);

            ctx.strokeStyle = "#00FF00";
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(x1, y1, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x2, y2, 5, 0, Math.PI * 2);
            ctx.fill();

            a1_v += a1_a;
            a2_v += a2_a;
            a1 += a1_v;
            a2 += a2_v;

            a1_v *= 0.999;
            a2_v *= 0.999;

            requestAnimationFrame(draw);
          }

          draw();
        });
      }, 0);
    }
  };
};
