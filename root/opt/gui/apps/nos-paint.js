// NOS Paint v1.8.2 – Horizontal Resize Fix Edition

module.exports = {
  application: () => {
    let appName = "nospaint";
    let appTitle = "NOS Paint";

    return {
      header: {
        appName,
        appTitle,
        active: true,
        iconSmall: "icon_16_paint.png",
        iconMedium: "icon_22_paint.png",
        iconLarge: "icon_32_paint.png",
        width: 740,
        height: 500,
        showContentWhileDragging: true,
      },
      content: `
        <div id="main-content-${appName}" style="padding:6px">
          <div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:6px">
            <button class="border rounded" onclick="window.NOSPaint.setTool('draw')">Draw</button>
            <button class="border rounded" onclick="window.NOSPaint.setTool('line')">Line</button>
            <button class="border rounded" onclick="window.NOSPaint.setTool('rect')">Box</button>
            <button class="border rounded" onclick="window.NOSPaint.setTool('ellipse')">Ellipse</button>
            <button class="border rounded" onclick="window.NOSPaint.setTool('text')">Text</button>
            <button class="border rounded" onclick="window.NOSPaint.setTool('erase')">Erase</button>
            <button class="border rounded" onclick="window.NOSPaint.undo()">Undo</button>
            <button class="border rounded" onclick="window.NOSPaint.redo()">Redo</button>
            <button class="border rounded" onclick="window.NOSPaint.clear()">Clear</button>
            <button class="border rounded" onclick="window.NOSPaint.randomColor()">Color</button>
            <button class="border rounded" onclick="window.NOSPaint.copyToClipboard()">Copy</button>
            <label>Stroke:
              <select class="border rounded" id="strokeSize" onchange="window.NOSPaint.setStroke(this.value)">
                <option value="1">1px</option>
                <option value="2">2px</option>
                <option value="3" selected>3px</option>
                <option value="4">4px</option>
                <option value="5">5px</option>
                <option value="6">6px</option>
                <option value="7">7px</option>
                <option value="8">8px</option>
                <option value="9">9px</option>
                <option value="10">10px</option>
              </select>
            </label>
          </div>
          <div id="canvas-container" style="border:1px solid #888; width:100%; height:380px; position:relative;">
            <canvas id="canvas-${appName}" style="background:#fff; cursor:crosshair;"></canvas>
          </div>
          <div id="color-boxes" style="display:flex; flex-wrap:wrap; width:100%; margin-top:8px; gap:2px"></div>
        </div>
      `,
      main: () => { },
      jsContent: (app) => {
        setTimeout(() => {
          const canvas = document.getElementById(
            `canvas-${app.header.appName}`
          );
          const container = document.getElementById("canvas-container");
          const ctx = canvas.getContext("2d");
          let tempCanvas = document.createElement("canvas");
          let tempCtx = tempCanvas.getContext("2d");

          let color = "#000",
            tool = "draw",
            stroke = 3;
          let painting = false,
            startX = 0,
            startY = 0,
            lastX = 0,
            lastY = 0;
          let undoData = null,
            redoData = null;

          function resizeCanvas() {
            requestAnimationFrame(() => {
              const backup = document.createElement("canvas");
              backup.width = canvas.width;
              backup.height = canvas.height;
              backup.getContext("2d").drawImage(canvas, 0, 0);

              canvas.width = container.clientWidth;
              canvas.height = container.clientHeight;
              tempCanvas.width = canvas.width;
              tempCanvas.height = canvas.height;
              ctx.drawImage(backup, 0, 0);
            });
          }

          window.addEventListener("resize", resizeCanvas);
          resizeCanvas();

          function saveUndo() {
            undoData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          }

          function restoreUndo() {
            if (undoData) {
              redoData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              ctx.putImageData(undoData, 0, 0);
              undoData = null;
            }
          }

          function restoreRedo() {
            if (redoData) {
              ctx.putImageData(redoData, 0, 0);
              redoData = null;
            }
          }

          canvas.addEventListener("mousedown", (e) => {
            const rect = canvas.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            lastX = startX;
            lastY = startY;
            if (tool === "text") {
              saveUndo();
              const txt = prompt("Enter text:");
              if (txt) {
                ctx.fillStyle = color;
                ctx.font = `${stroke * 6}px monospace`;
                const metrics = ctx.measureText(txt);
                const textWidth = metrics.width;
                const textHeight = stroke * 6;
                ctx.fillText(
                  txt,
                  startX - textWidth / 2,
                  startY + textHeight / 2
                );
              }
              return;
            }
            painting = true;
            saveUndo();
            if (!["draw", "erase"].includes(tool)) {
              tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
              tempCtx.drawImage(canvas, 0, 0);
            }
          });

          canvas.addEventListener("mouseup", (e) => {
            painting = false;
            const rect = canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            ctx.lineWidth = stroke;
            ctx.strokeStyle = color;

            if (tool === "line") {
              ctx.beginPath();
              ctx.moveTo(startX, startY);
              ctx.lineTo(endX, endY);
              ctx.stroke();
            } else if (tool === "rect") {
              ctx.strokeRect(startX, startY, endX - startX, endY - startY);
            } else if (tool === "ellipse") {
              ctx.beginPath();
              ctx.ellipse(
                (startX + endX) / 2,
                (startY + endY) / 2,
                Math.abs(endX - startX) / 2,
                Math.abs(endY - startY) / 2,
                0,
                0,
                2 * Math.PI
              );
              ctx.stroke();
            }
          });

          canvas.addEventListener("mousemove", (e) => {
            if (!painting) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (tool === "draw") {
              ctx.strokeStyle = color;
              ctx.lineWidth = stroke;
              ctx.beginPath();
              ctx.moveTo(lastX, lastY);
              ctx.lineTo(x, y);
              ctx.stroke();
              lastX = x;
              lastY = y;
            } else if (tool === "erase") {
              ctx.clearRect(x - stroke, y - stroke, stroke * 2, stroke * 2);
            } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(tempCanvas, 0, 0);
              ctx.strokeStyle = color;
              ctx.lineWidth = stroke;
              if (tool === "line") {
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(x, y);
                ctx.stroke();
              } else if (tool === "rect") {
                ctx.strokeRect(startX, startY, x - startX, y - startY);
              } else if (tool === "ellipse") {
                ctx.beginPath();
                ctx.ellipse(
                  (startX + x) / 2,
                  (startY + y) / 2,
                  Math.abs(x - startX) / 2,
                  Math.abs(y - startY) / 2,
                  0,
                  0,
                  2 * Math.PI
                );
                ctx.stroke();
              }
            }
          });

          const colorBoxContainer = document.getElementById("color-boxes");
          const popularColors = [
            "#000000",
            "#808080",
            "#C0C0C0",
            "#FFFFFF",
            "#800000",
            "#FF0000",
            "#808000",
            "#FFFF00",
            "#008000",
            "#00FF00",
            "#008080",
            "#00FFFF",
            "#000080",
            "#0000FF",
            "#800080",
            "#FF00FF",
            "#A52A2A",
            "#FFA500",
            "#A9A9A9",
            "#2F4F4F",
          ];
          popularColors.forEach((col) => {
            const box = document.createElement("div");
            box.style.width = "32px";
            box.style.height = "20px";
            box.style.border = "1px solid #000";
            box.style.background = col;
            box.style.cursor = "pointer";
            box.onclick = () => (color = col);
            colorBoxContainer.appendChild(box);
          });

          window.NOSPaint = {
            setTool: (t) => (tool = t),
            setStroke: (s) => (stroke = parseInt(s)),
            clear: () => ctx.clearRect(0, 0, canvas.width, canvas.height),
            randomColor: () => {
              color =
                "#" +
                Math.floor(Math.random() * 0xffffff)
                  .toString(16)
                  .padStart(6, "0");
            },
            undo: restoreUndo,
            redo: restoreRedo,
            copyToClipboard: () => {
              const dataUrl = canvas.toDataURL("image/png");
              fetch(dataUrl)
                .then((res) => res.blob())
                .then((blob) => {
                  const item = new ClipboardItem({ "image/png": blob });
                  navigator.clipboard.write([item]);
                });
            },
          };
        }, 300);
      },
    };
  },
};
