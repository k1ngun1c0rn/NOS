module.exports.application = () => {
  const appName = "lorenzchaos";
  const appTitle = "Lorenz Attractor";

  return {
    header: {
      appName,
      appTitle,
      active: true,
      iconSmall: "icon_16_star.png",
      iconMedium: "icon_22_star.png",
      iconLarge: "icon_32_app.png",
      width: 700,
      height: 440
    },
    content: `
      <div class="p-2 text-sm">
        <label>x₀: <input id="x0-${appName}" type="number" value="0.1" step="0.01" style="width:60px"/></label>
        <label>y₀: <input id="y0-${appName}" type="number" value="0" step="0.01" style="width:60px"/></label>
        <label>z₀: <input id="z0-${appName}" type="number" value="0" step="0.01" style="width:60px"/></label>
        <button id="run-${appName}">Plot</button>
      </div>
      <canvas id="canvas-${appName}" width="660" height="320" style="border:1px solid #444;margin:10px;"></canvas>
    `,
    main: () => { },
    jsContent: (app) => {
      setTimeout(() => {
        const x0 = document.getElementById(`x0-${app.header.appName}`);
        const y0 = document.getElementById(`y0-${app.header.appName}`);
        const z0 = document.getElementById(`z0-${app.header.appName}`);
        const canvas = document.getElementById(`canvas-${app.header.appName}`);
        const ctx = canvas.getContext("2d");
        const runBtn = document.getElementById(`run-${app.header.appName}`);

        runBtn.addEventListener("click", () => {
          let x = parseFloat(x0.value);
          let y = parseFloat(y0.value);
          let z = parseFloat(z0.value);

          const sigma = 10, rho = 28, beta = 8 / 3;
          const dt = 0.01;
          const steps = 10000;

          const points = [];

          for (let i = 0; i < steps; i++) {
            const dx = sigma * (y - x);
            const dy = x * (rho - z) - y;
            const dz = x * y - beta * z;

            x += dx * dt;
            y += dy * dt;
            z += dz * dt;

            points.push({ x, y, z });
          }

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = "#008000";
          ctx.beginPath();

          for (let i = 0; i < points.length; i++) {
            const px = 320 + points[i].x * 5;
            const py = 300 - points[i].z * 5;

            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }

          ctx.stroke();
        });
      }, 0);
    }
  };
};
