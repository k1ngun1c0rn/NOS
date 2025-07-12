module.exports.application = () => ({
  header: {
    appName: "particlelab",
    appTitle: "NOS Particle Lab",
    iconSmall: "icon_16_star.png",
    iconMedium: "icon_22_star.png",
    iconLarge: "icon_32_app.png",
    active: true,
    width: 900,
    height: 680,
    resizable: true
  },
  content: `
    <div class="container py-2">
      <h5 class="text-center mb-2">Particle Effect Lab ✨</h5>
      <div class="form-check">
        <input class="form-check-input" type="radio" name="mode" id="fireworks" value="fireworks" checked>
        <label class="form-check-label" for="fireworks">Fireworks</label>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="radio" name="mode" id="trail" value="trail">
        <label class="form-check-label" for="trail">Magic Cursor Trail</label>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="radio" name="mode" id="warp" value="warp">
        <label class="form-check-label" for="warp">Starfield Warp</label>
      </div>
      <div class="form-check">
        <input class="form-check-input" type="radio" name="mode" id="bubble" value="bubble">
        <label class="form-check-label" for="bubble">Bubble Pop</label>
      </div>
      <div class="form-check mb-2">
        <input class="form-check-input" type="radio" name="mode" id="aurora" value="aurora">
        <label class="form-check-label" for="aurora">Aurora Flow</label>
      </div>
      <canvas id="particle-canvas" width="860" height="440" class="border rounded w-100"></canvas>
    </div>
  `,
  main: () => { },
  jsContent: (app) => {
    const canvas = document.getElementById("particle-canvas");
    const ctx = canvas.getContext("2d");
    let particles = [], mode = "fireworks", tick = 0;

    function randomColor() {
      const colors = ["#f33", "#3f3", "#39f", "#ff0", "#f0f"];
      return colors[Math.floor(Math.random() * colors.length)];
    }

    function spawn(mode, x, y) {
      for (let i = 0; i < 20; i++) {
        particles.push({
          x, y,
          dx: (Math.random() - 0.5) * 4,
          dy: (Math.random() - 0.5) * 4,
          size: Math.random() * 3 + 2,
          life: 60,
          color: randomColor()
        });
      }
    }

    function draw() {
      ctx.fillStyle = mode === "warp" ? "rgba(0,0,0,0.2)" : "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      tick++;

      if (mode === "warp") {
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * 2 * Math.PI;
          const speed = Math.random() * 2 + 1;
          particles.push({
            x: canvas.width / 2,
            y: canvas.height / 2,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            size: 1,
            life: 80,
            color: `hsl(${tick % 360}, 100%, 80%)`
          });
        }
      }

      if (mode === "aurora") {
        for (let i = 0; i < 2; i++) {
          particles.push({
            x: Math.random() * canvas.width,
            y: canvas.height,
            dx: Math.sin(tick / 10) * 0.5,
            dy: -Math.random() * 1.5,
            size: Math.random() * 2 + 1,
            life: 100,
            color: `hsl(${tick % 360}, 80%, 60%)`
          });
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        p.life--;
        if (p.life <= 0 || p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
          particles.splice(i, 1);
        }
      }
      requestAnimationFrame(draw);
    }

    canvas.addEventListener("click", (e) => {
      if (mode === "fireworks" || mode === "bubble") {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        spawn(mode, x, y);
      }
    });

    canvas.addEventListener("mousemove", (e) => {
      if (mode === "trail") {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        spawn("trail", x, y);
      }
    });

    $("input[name='mode']").on("change", function () {
      mode = this.value;
    });

    draw();
  }
});
