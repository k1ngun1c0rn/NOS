const { default: start } = require("mqtt/bin/pub");

// zininademo.js - Demo showcase semua komponen Zinnia
module.exports = {
  application: (uuid) => {
    const appName = 'tamiya';
    const appTitle = 'Tamiya Race';
    return {
      header: {
        appName,
        appTitle,
        uuid,
        active: true,
        iconSmall: "icon_16_app.png",
        iconMedium: "icon_22_app.png",
        iconLarge: "icon_32_app.png",
        resizable: true,
        width: 650,
        height: 550,
      },
      content: `
        <style>
          canvas {
            background-color: #f0f0f0;
          }
        </style>
        <div class="tamiya-race-container" data-app="${appName}" data-uuid="${uuid}">
        <canvas></canvas>
        </div>`
      ,
      main: (sender, nos) => {
        const serialPortEnabled = false;

        let serialport;
        if (serialPortEnabled)
          serialport = nos.getDevice("serialport");
        sender.ws.remoteFunction.tamiya = {};
        sender.ws.remoteFunction.tamiya.hitSensor = (params) => {
          const channel = params[0];
          const msgToSerial = `hit${channel}\n`;
          if (serialPortEnabled)
            serialport.write(msgToSerial);
        };
        if (serialPortEnabled)
          serialport.addListener("tamiya", (data) => {
            console.log(">>", data);
            sender.ws.sendMessage(`ngs/${uuid}`, {
              type: "serialportmsg",
              msg: data,
            });
          });
      },
      jsContent: (app) => {
        const appUuid = app.header.uuid;

        RFC.registerListener(`ngs/${appUuid}`, (data) => {
          console.log("Incoming from serialport", data.msg);
        });

        const parentSelector = `.tamiya-race-container[data-uuid="${appUuid}"]`;
        const parent = document.querySelector(parentSelector);
        const canvas = parent.querySelector('canvas');
        const canvasWidth = 600, canvasHeight = 450;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');
        const lanes = 5;
        const laneWidth = 10;
        const r = 120;
        const cx = canvasWidth / 2;
        const cy = canvasHeight / 2;
        const offsetY = 90;
        const colors = ['#1976d2', '#fbc02d', '#1976d2', '#fbc02d', '#1976d2'];
        // --- Animasi tamiya ---
        const tamiyaColors = ['#d32f2f', '#1976d2', '#43a047', '#fbc02d', '#8e24aa'];
        const carRadius = laneWidth - 5;
        // --- Animasi tamiya dengan progress 0-100 ---
        // Hitung panjang lintasan (dua setengah lingkaran + dua garis lurus)
        function getTrackLength(rad) {
          const arcLen = Math.PI * rad; // setengah lingkaran atas/bawah
          const straightLen = 2 * offsetY;
          return 2 * arcLen + 2 * straightLen;
        }
        // Atur posisi start tiap mobil (0-100)
        const startPositions = 85;
        let carStarts = [startPositions, startPositions, startPositions, startPositions, startPositions]; // bisa diubah sesuai kebutuhan
        window.cars = [];
        let carSpeeds = [];
        for (let i = 0; i < lanes; i++) {
          carSpeeds.push(Math.random() * 0.1 + .1); // kecepatan mobil acak, dalam % per frame
        }
        for (let i = 0; i < lanes; i++) {
          cars.push({
            progress: carStarts[i], // progress 0-100
            speed: carSpeeds[i],
          });
        }
        // State kontrol
        let isRunning = false;
        // Buat tombol Start dan Reset
        const controlDiv = document.createElement('div');
        controlDiv.className = 'mb-3';
        const startBtn = document.createElement('button');
        startBtn.textContent = 'Start';
        startBtn.className = 'btn btn-success me-2';
        const resetBtn = document.createElement('button');
        resetBtn.textContent = 'Reset';
        resetBtn.className = 'btn btn-danger';
        controlDiv.appendChild(startBtn);
        controlDiv.appendChild(resetBtn);
        parent.insertBefore(controlDiv, canvas);

        // Handler tombol
        startBtn.onclick = () => { isRunning = true; };
        resetBtn.onclick = () => {
          isRunning = false;
          for (let i = 0; i < lanes; i++) {
            carSpeeds[i] = (Math.random() * 0.1 + .1); // kecepatan mobil acak, dalam % per frame
          }
          for (let i = 0; i < cars.length; i++) {
            cars[i].progress = carStarts[i];
            cars[i].targetSpeed = carSpeeds[i]; // reset kecepatan target juga
            cars[i].speed = carSpeeds[i];
          }
        };

        // --- Speed change logic ---
        const rateChange = 5 * 1000; // ms, setiap 3 detik
        let lastRateChange = Date.now();
        for (let i = 0; i < cars.length; i++) {
          cars[i].targetSpeed = cars[i].speed;
        }
        function updateCarSpeedsSmooth() {
          const now = Date.now();
          if (now - lastRateChange > rateChange) {
            // Set targetSpeed baru secara acak
            for (let i = 0; i < cars.length; i++) {
              cars[i].targetSpeed = Math.random() * 0.1 + 0.5;
            }
            lastRateChange = now;
          }
          // Smooth transition ke targetSpeed
          for (let i = 0; i < cars.length; i++) {
            const car = cars[i];
            // Lerp: speed += (targetSpeed - speed) * smoothing
            car.speed += (car.targetSpeed - car.speed) * 0.03; // smoothing rate
          }
        }

        function updateCars() {
          if (!isRunning) return;
          updateCarSpeedsSmooth();
          for (let lane = 0; lane < lanes; lane++) {
            const car = cars[lane];
            car.progress += car.speed;
            if (car.progress > 100) car.progress -= 100;
          }
        }

        // Fungsi konversi progress (0-100) ke koordinat lintasan
        function getCarPosition(progress, lane) {
          // const rad = r - lane * laneWidth;
          const rad = r - 1 * laneWidth;
          const arcLen = Math.PI * rad;
          const straightLen = 2 * offsetY;
          const totalLen = 2 * arcLen + 2 * straightLen;
          let dist = (progress / 100) * totalLen;
          // Bagian 1: setengah lingkaran atas
          if (dist < arcLen) {
            const angle = Math.PI + (dist / arcLen) * Math.PI;
            return {
              x: cx + rad * Math.cos(angle),
              y: (cy - offsetY) + rad * Math.sin(angle),
            };
          }
          dist -= arcLen;
          // Bagian 2: garis kanan turun
          if (dist < straightLen) {
            return {
              x: cx + rad,
              y: (cy - offsetY) + dist,
            };
          }
          dist -= straightLen;
          // Bagian 3: setengah lingkaran bawah
          if (dist < arcLen) {
            const angle = (dist / arcLen) * Math.PI;
            return {
              x: cx + rad * Math.cos(angle),
              y: (cy + offsetY) + rad * Math.sin(angle),
            };
          }
          dist -= arcLen;
          // Bagian 4: garis kiri naik
          return {
            x: cx - rad,
            y: (cy + offsetY) - dist,
          };
        }
        // Fungsi untuk menggambar garis bar (start/finish) di progress tertentu (0-100)
        function drawBarAt(progress, color = '#e53935', width = 4) {
          for (let lane = 0; lane < lanes; lane++) {
            const rad = r - lane * laneWidth;
            // Ambil dua titik di sisi luar dan dalam lane pada progress tsb
            const posOuter = getCarPosition(progress, lane - 0.5);
            const posInner = getCarPosition(progress, lane + 0.5);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(posOuter.x, posOuter.y);
            ctx.lineTo(posInner.x, posInner.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.shadowColor = color;
            ctx.shadowBlur = 6;
            ctx.stroke();
            ctx.restore();
          }
        }
        // Fungsi untuk mendeteksi mobil yang mengenai bar di progress tertentu
        function detectCar(barProgress, tolerance = 1) {
          // tolerance dalam satuan progress (0-100), default 1%
          for (let i = 0; i < cars.length; i++) {
            let diff = Math.abs((cars[i].progress % 100) - (barProgress % 100));
            // handle wrap-around (misal 99 dan 1)
            if (diff > 50) diff = 100 - diff;
            if (diff <= tolerance) {
              return i; // index mobil yang mengenai bar
            }
          }
          return -1; // tidak ada yang mengenai bar
        }
        function drawTrack() {
          for (let lane = 0; lane < lanes; lane++) {
            ctx.save();
            ctx.strokeStyle = colors[lane % colors.length];
            ctx.lineWidth = laneWidth;
            const rad = r - lane * laneWidth;
            // Atas (lingkaran atas)
            ctx.beginPath();
            ctx.arc(cx, cy - offsetY, rad, Math.PI, Math.PI * 2, false);
            ctx.stroke();
            // Bawah (lingkaran bawah)
            ctx.beginPath();
            ctx.arc(cx, cy + offsetY, rad, 0, Math.PI, false);
            ctx.stroke();
            // Konektor kiri
            ctx.beginPath();
            ctx.moveTo(cx - rad, cy - offsetY);
            ctx.lineTo(cx - rad, cy + offsetY);
            ctx.stroke();
            // Konektor kanan
            ctx.beginPath();
            ctx.moveTo(cx + rad, cy - offsetY);
            ctx.lineTo(cx + rad, cy + offsetY);
            ctx.stroke();
            ctx.restore();
          }
        }
        function drawCars() {
          for (let lane = 0; lane < lanes; lane++) {
            const car = cars[lane];
            const { x, y } = getCarPosition(car.progress, lane);
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, carRadius, 0, Math.PI * 2);
            ctx.fillStyle = tamiyaColors[lane % tamiyaColors.length];
            ctx.globalAlpha = 0.85;
            ctx.shadowColor = '#333';
            ctx.shadowBlur = 4;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#222';
            ctx.stroke();
            ctx.restore();
          }
        }
        function updateCars() {
          if (!isRunning) return;
          for (let lane = 0; lane < lanes; lane++) {
            const car = cars[lane];
            car.progress += car.speed;
            if (car.progress > 100) car.progress -= 100;
          }
        }

        function parseKmlCoordString(str) {
          // Split by space, then split each by comma, ambil [lon, lat]
          return str.trim().split(/\s+/).map(coord => {
            const [lon, lat] = coord.split(',').map(Number);
            return [lon, lat];
          });
        }
        const kmlString = "107.7662428803491,-6.94080287685667,0 107.767076792292,-6.940293838470178,0 107.769445850128,-6.939906146854288,0 107.7718523201008,-6.940119413887655,0 107.7731994821792,-6.941529731909285,0 107.7738961656292,-6.943277562230877,0 107.7750605769257,-6.944441630949357,0 107.7770786606426,-6.945302766350585,0 107.7784691317782,-6.946007468409593,0 107.7788782855023,-6.947547474103996,0 107.7785313952505,-6.949776133739244,0 107.7780046607784,-6.950680870488382,0 107.7764699424686,-6.951507890331754,0 107.7743046283657,-6.951078253767984,0 107.7728356374839,-6.949765434786822,0 107.7731712826891,-6.94803540793049,0 107.7731043966961,-6.946763891109432,0 107.7724613959705,-6.946006701836651,0 107.7714996077483,-6.945999598818187,0 107.7708142443185,-6.946582727493027,0 107.7706262918829,-6.947899081326121,0 107.7701256780838,-6.948753493602521,0 107.7690859946599,-6.948774291651896,0 107.7679556722811,-6.948397105920422,0 107.7667715092213,-6.947268577887886,0 107.7661599469166,-6.946292337539049,0 107.7656777453146,-6.945172248359898,0 107.765483361588,-6.944078796974368,0 107.7654558790463,-6.943196423209635,0 107.7654467258788,-6.94214238313134,0 107.7657793628635,-6.941454902721022,0 107.7662428803491,-6.94080287685667,0"
        const kmlCoords = parseKmlCoordString(kmlString);
        // const kmlCoords = [
        //   [107.759776040459, -6.941207586680271], [107.7600322737946, -6.94098178366157], [107.7602760755752, -6.940544628428437], [107.7605390892451, -6.94040888423734], [107.761020059394, -6.940323422060457], [107.7613713494576, -6.940129589973592], [107.7615717131313, -6.939799532805718], [107.7615391597362, -6.939363447573464], [107.7611495343576, -6.939137298024095], [107.7606479352433, -6.939056085869502], [107.7602893142785, -6.939195610410931], [107.7601645185078, -6.939552755644407], [107.7601513316955, -6.939831376329869], [107.760284616274, -6.940056647297065], [107.7604399637578, -6.940307067139651], [107.760626883555, -6.940628466969287], [107.7609644524977, -6.940938307919371], [107.7612601847696, -6.941167455215797], [107.7614598756638, -6.941499172369763], [107.7614027258012, -6.941883691067163], [107.7612298948992, -6.942145711319882], [107.7606404942986, -6.9421987681286], [107.7601109446864, -6.941958849209473], [107.7597725669122, -6.941614700347114], [107.759776040459, -6.941207586680271]
        // ];
        // --- Spline smoothing untuk KML ---
        // Catmull-Rom spline interpolation
        function catmullRomSpline(points, numPointsPerSegment = 10) {
          const result = [];
          const n = points.length;
          for (let i = 0; i < n - 1; i++) {
            // Ambil 4 titik: p0, p1, p2, p3
            const p0 = points[(i - 1 + n) % n];
            const p1 = points[i];
            const p2 = points[(i + 1) % n];
            const p3 = points[(i + 2) % n];
            for (let j = 0; j < numPointsPerSegment; j++) {
              const t = j / numPointsPerSegment;
              // Catmull-Rom formula
              const tt = t * t;
              const ttt = tt * t;
              const x = 0.5 * ((2 * p1[0]) +
                (-p0[0] + p2[0]) * t +
                (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * tt +
                (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * ttt);
              const y = 0.5 * ((2 * p1[1]) +
                (-p0[1] + p2[1]) * t +
                (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * tt +
                (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * ttt);
              result.push([x, y]);
            }
          }
          return result;
        }
        // Terapkan smoothing pada kmlCoords
        const smoothedKmlCoords = catmullRomSpline(kmlCoords, 12); // 12 titik per segmen, bisa diubah sesuai halusnya
        // Konversi lat-lon ke canvas XY
        function getKmlBounds(coords) {
          let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
          for (const [lon, lat] of coords) {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
          }
          return { minLat, maxLat, minLon, maxLon };
        }
        const kmlBounds = getKmlBounds(smoothedKmlCoords);
        const scaleX = 0.8; // makin kecil, makin tidak stretch horizontal
        const scaleY = 0.85; // makin besar, makin penuh vertikal
        function latLonToCanvas(lon, lat) {
          const x = ((lon - kmlBounds.minLon) / (kmlBounds.maxLon - kmlBounds.minLon)) * (canvasWidth * scaleX) + canvasWidth * (1 - scaleX) / 2;
          const y = ((lat - kmlBounds.minLat) / (kmlBounds.maxLat - kmlBounds.minLat)) * (canvasHeight * scaleY) + canvasHeight * (1 - scaleY) / 2;
          return { x, y: canvasHeight - y };
        }
        // Track hasil mapping
        const trackPoints = smoothedKmlCoords.map(([lon, lat]) => latLonToCanvas(lon, lat));
        // Gambar track dari KML
        function drawTrackKml() {
          ctx.save();
          ctx.strokeStyle = '#1976d2';
          ctx.lineWidth = 12;
          ctx.beginPath();
          for (let i = 0; i < trackPoints.length; i++) {
            const pt = trackPoints[i];
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
        // --- Mobil di atas track KML ---
        // Hitung panjang lintasan KML (jarak antar titik)
        function distance(p1, p2) {
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          return Math.sqrt(dx * dx + dy * dy);
        }
        // Precompute cumulative length
        let kmlSegmentLengths = [];
        let kmlCumulative = [0];
        let totalKmlLength = 0;
        for (let i = 1; i < trackPoints.length; i++) {
          const d = distance(trackPoints[i - 1], trackPoints[i]);
          kmlSegmentLengths.push(d);
          totalKmlLength += d;
          kmlCumulative.push(totalKmlLength);
        }
        // Fungsi: progress 0-100 ke posisi di track KML
        function getCarPositionKml(progress) {
          const targetDist = (progress / 100) * totalKmlLength;
          // Cari segmen di mana targetDist berada
          let segIdx = 0;
          while (segIdx < kmlCumulative.length - 1 && kmlCumulative[segIdx + 1] < targetDist) {
            segIdx++;
          }
          // Interpolasi di segmen tsb
          const segStart = trackPoints[segIdx];
          const segEnd = trackPoints[(segIdx + 1) % trackPoints.length];
          const segLen = kmlSegmentLengths[segIdx % kmlSegmentLengths.length];
          const segDist = targetDist - kmlCumulative[segIdx];
          const t = segLen === 0 ? 0 : segDist / segLen;
          return {
            x: segStart.x + (segEnd.x - segStart.x) * t,
            y: segStart.y + (segEnd.y - segStart.y) * t
          };
        }
        // Gambar mobil di atas track KML
        function drawCarsKml() {
          for (let lane = 0; lane < lanes; lane++) {
            const car = cars[lane];
            const { x, y } = getCarPositionKml(car.progress);
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, carRadius, 0, Math.PI * 2);
            ctx.fillStyle = tamiyaColors[lane % tamiyaColors.length];
            ctx.globalAlpha = 0.85;
            ctx.shadowColor = '#333';
            ctx.shadowBlur = 4;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#222';
            ctx.stroke();
            ctx.restore();
          }
        }
        // Deteksi mobil mengenai bar di progress tertentu (track KML)
        function detectCarKml(barProgress, tolerance = 1) {
          for (let i = 0; i < cars.length; i++) {
            let diff = Math.abs((cars[i].progress % 100) - (barProgress % 100));
            if (diff > 50) diff = 100 - diff;
            if (diff <= tolerance) {
              return i;
            }
          }
          return -1;
        }
        // --- Multi-lane KML Track ---
        // Offset track untuk tiap lane (misal: geser tegak lurus segmen)
        function getLaneOffsetVector(idx) {
          // Ambil vektor tegak lurus segmen idx
          const p0 = trackPoints[idx];
          const p1 = trackPoints[(idx + 1) % trackPoints.length];
          const dx = p1.x - p0.x;
          const dy = p1.y - p0.y;
          // Vektor normal (tegak lurus, arah kanan lintasan)
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          return { nx: -dy / len, ny: dx / len };
        }
        // Buat array track untuk tiap lane
        const laneGap = carRadius * 2 + 2; // Jarak antar lane (px)
        function getTrackPointsForLane(laneIdx) {
          // Lane 0 = paling luar, lane lanes-1 = paling dalam
          const offset = (laneIdx - (lanes - 1) / 2) * laneGap;
          let laneTrack = [];
          for (let i = 0; i < trackPoints.length; i++) {
            const { nx, ny } = getLaneOffsetVector(i);
            laneTrack.push({
              x: trackPoints[i].x + nx * offset,
              y: trackPoints[i].y + ny * offset
            });
          }
          return laneTrack;
        }
        // Precompute semua lane
        const allLaneTracks = [];
        for (let lane = 0; lane < lanes; lane++) {
          allLaneTracks.push(getTrackPointsForLane(lane));
        }
        // --- Gambar multi-lane track ---
        function drawTrackKmlMulti() {
          for (let lane = 0; lane < lanes; lane++) {
            ctx.save();
            ctx.strokeStyle = colors[lane % colors.length];
            ctx.lineWidth = 10;
            ctx.beginPath();
            const laneTrack = allLaneTracks[lane];
            for (let i = 0; i < laneTrack.length; i++) {
              const pt = laneTrack[i];
              if (i === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            }
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
          }
        }
        // --- Mobil di atas multi-lane track ---
        // Hitung panjang lintasan tiap lane
        const laneLengths = [];
        const laneCumulatives = [];
        for (let lane = 0; lane < lanes; lane++) {
          const laneTrack = allLaneTracks[lane];
          let segLens = [];
          let cumul = [0];
          let total = 0;
          for (let i = 1; i < laneTrack.length; i++) {
            const d = distance(laneTrack[i - 1], laneTrack[i]);
            segLens.push(d);
            total += d;
            cumul.push(total);
          }
          laneLengths.push(total);
          laneCumulatives.push(cumul);
        }
        function getCarPositionKmlMulti(progress, lane) {
          const laneTrack = allLaneTracks[lane];
          const cumul = laneCumulatives[lane];
          const segLens = [];
          for (let i = 1; i < laneTrack.length; i++) {
            segLens.push(distance(laneTrack[i - 1], laneTrack[i]));
          }
          const totalLen = laneLengths[lane];
          const targetDist = (progress / 100) * totalLen;
          let segIdx = 0;
          while (segIdx < cumul.length - 1 && cumul[segIdx + 1] < targetDist) {
            segIdx++;
          }
          const segStart = laneTrack[segIdx];
          const segEnd = laneTrack[(segIdx + 1) % laneTrack.length];
          const segLen = segLens[segIdx % segLens.length];
          const segDist = targetDist - cumul[segIdx];
          const t = segLen === 0 ? 0 : segDist / segLen;
          return {
            x: segStart.x + (segEnd.x - segStart.x) * t,
            y: segStart.y + (segEnd.y - segStart.y) * t
          };
        }
        // Gambar mobil di atas multi-lane track
        function drawCarsKmlMulti() {
          for (let lane = 0; lane < lanes; lane++) {
            const car = cars[lane];
            const { x, y } = getCarPositionKmlMulti(car.progress, lane);
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, carRadius, 0, Math.PI * 2);
            ctx.fillStyle = tamiyaColors[lane % tamiyaColors.length];
            ctx.globalAlpha = 0.85;
            ctx.shadowColor = '#333';
            ctx.shadowBlur = 4;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#222';
            ctx.stroke();
            ctx.restore();
          }
        }
        // --- Animasi utama pakai multi-lane track ---
        let lastDetected = -1;
        function animate() {
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          drawTrackKmlMulti();
          drawCarsKmlMulti();

          updateCars();
          drawBarAt(10, '#43a047', 5); // Start (hijau)
          // Deteksi mobil yang mengenai bar (hanya di lane 0 misal)
          const detectedIdx = detectCarKml(0, 1);
          if (detectedIdx !== -1 && detectedIdx !== lastDetected) {
            const channel = String.fromCharCode(65 + detectedIdx);
            RFC.callRFC("tamiya.hitSensor", [channel], function (list) {
              lastDetected = detectedIdx;
            });
            lastDetected = detectedIdx;
          }
          if (detectedIdx === -1) {
            lastDetected = -1;
          }
          requestAnimationFrame(animate);
        }
        animate();
      },
    };
  },
};