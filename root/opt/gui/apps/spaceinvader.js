// module.exports = {
//   application: (uuid) => {
//     let appName = "spaceinvaders";
//     let appTitle = "Space Invaders";

//     return {
//       header: {
//         appName,
//         appTitle,
//         version: "1.0",
//         uuid,
//         active: true,
//         iconSmall: "icon_16_app.png",
//         iconMedium: "icon_22_app.png",
//         iconLarge: "icon_32_app.png",
//         resizable: true,
//         width: 700, // Lebar aplikasi
//         height: 600 // Tinggi aplikasi
//       },
//       content: `
//         <style type="text/css">
//           .main-container {
//             display: flex;
//             flex-direction: column;
//             align-items: center;
//             justify-content: flex-start;
//             padding: 10px;
//             height: 100%;
//             box-sizing: border-box;
//             font-family: 'Inter', sans-serif;
//             background-color: #0d0d0d; /* Darker background for space theme */
//             position: relative;
//             overflow: hidden; /* Prevent content from overflowing */
//           }
//           canvas.game-canvas {
//             background: #000; /* Black for space */
//             display: block;
//             margin: 10px auto;
//             border: 2px solid #00f; /* Blue border for sci-fi feel */
//             border-radius: 8px;
//             box-shadow: 0 0 20px rgba(0, 0, 255, 0.7); /* Glowing blue effect */
//             max-width: 100%;
//             width: 90%;
//             height: 380px;
//           }
//           .game-score {
//             color: #00ff00; /* Bright green for score */
//             text-align: center;
//             font-family: monospace;
//             font-size: 24px;
//             margin-bottom: 15px;
//             text-shadow: 0 0 8px #00ff00;
//             font-weight: bold;
//           }
//           .game-message {
//             color: #FFFF00; /* Yellow for messages */
//             text-align: center;
//             font-family: 'Inter', sans-serif;
//             font-size: 32px; /* Larger font for messages */
//             font-weight: bold;
//             text-shadow: 0 0 10px rgba(255, 255, 0, 0.8);
//             position: absolute;
//             top: calc(50% + 0px); /* Menggeser pesan ke bawah 50px */
//             left: 50%;
//             transform: translate(-50%, -50%);
//             background-color: rgba(0, 0, 0, 0.8); /* Semi-transparent black background */
//             padding: 20px 40px;
//             border-radius: 12px;
//             display: none;
//             z-index: 10;
//             line-height: 1.4;
//           }
//           .controls-container {
//             margin-top: 20px;
//             text-align: center;
//           }
//           .action-button {
//             background-color: #007bff; /* Blue button */
//             color: white;
//             padding: 15px 30px;
//             border: none;
//             border-radius: 10px;
//             cursor: pointer;
//             font-size: 20px;
//             font-weight: bold;
//             box-shadow: 0 5px 15px rgba(0, 123, 255, 0.4);
//             transition: background-color 0.3s ease, box-shadow 0.3s ease, transform 0.1s ease;
//           }
//           .action-button:hover {
//             background-color: #0056b3; /* Darker blue on hover */
//             box-shadow: 0 8px 20px rgba(0, 123, 255, 0.6);
//           }
//           .action-button:active {
//             background-color: #004085;
//             box-shadow: 0 2px 5px rgba(0, 123, 255, 0.3);
//             transform: translateY(2px);
//           }

//           @media (max-width: 768px) {
//             .game-score {
//               font-size: 20px;
//             }
//             .game-message {
//               font-size: 26px;
//               padding: 15px 30px;
//               top: calc(50% + 40px); /* Adjusted for smaller screens */
//             }
//             .action-button {
//               padding: 12px 25px;
//               font-size: 18px;
//             }
//           }
//           @media (max-width: 480px) {
//             .game-score {
//               font-size: 18px;
//             }
//             .game-message {
//               font-size: 22px;
//               padding: 10px 20px;
//               top: calc(50% + 30px); /* Adjusted for even smaller screens */
//             }
//             .action-button {
//               padding: 10px 20px;
//               font-size: 16px;
//             }
//           }
//         </style>
//         <div class="main-container" data-app="${appName}" data-uuid="${uuid}">
//           <div class="game-score">Score: <span id="game-score-${uuid}">0</span></div>
//           <canvas class="game-canvas" id="game-canvas-${uuid}"></canvas>
//           <div class="game-message" id="game-message-${uuid}"></div>
//           <div class="controls-container">
//             <button id="action-button-${uuid}" class="action-button">Start Game</button>
//           </div>
//         </div>` ,
//       main: (sender, nos) => {
//         // Logika backend opsional (sisi NOS)
//       },
//       jsContent: (app) => {
//         // Logika game Space Invaders
//         const uuid = app.header.uuid;
//         const container = document.querySelector(`.main-container[data-uuid="${uuid}"]`);
//         const canvas = document.getElementById(`game-canvas-${uuid}`);
//         const ctx = canvas.getContext('2d');
//         const scoreEl = document.getElementById(`game-score-${uuid}`);
//         const gameMessageEl = document.getElementById(`game-message-${uuid}`);
//         const actionButton = document.getElementById(`action-button-${uuid}`);

//         // --- Konstanta Game untuk Tuning ---
//         const PLAYER_SPEED = 5; // Kecepatan gerakan pemain (pixel per frame)
//         const PLAYER_BULLET_SPEED = 7; // Kecepatan peluru pemain (pixel per frame)
//         const ENEMY_SPEED_X = 1; // Kecepatan horizontal musuh
//         const ENEMY_SPEED_Y = 20; // Seberapa jauh musuh bergerak ke bawah saat mencapai batas
//         const ENEMY_MOVE_INTERVAL = 800; // Interval gerakan musuh (ms)
//         const ENEMY_ROWS = 5; // Jumlah baris musuh
//         const ENEMY_COLS = 8; // Jumlah kolom musuh
//         const ENEMY_SPACING_X = 50; // Jarak horizontal antar musuh
//         const ENEMY_SPACING_Y = 40; // Jarak vertikal antar musuh
//         const INITIAL_ENEMY_OFFSET_X = 50; // Offset awal X untuk grid musuh
//         const INITIAL_ENEMY_OFFSET_Y = 30; // Offset awal Y untuk grid musuh
//         const BULLET_COOLDOWN = 300; // Cooldown tembak pemain (ms)
//         // --- Akhir Konstanta Game ---

//         let canvasWidth, canvasHeight;

//         // Objek Game State
//         let player = {
//           x: 0,
//           y: 0,
//           width: 40,
//           height: 20,
//           movingLeft: false,
//           movingRight: false,
//           canShoot: true,
//           lastShotTime: 0
//         };
//         let bullets = []; // Array untuk peluru pemain
//         let enemies = []; // Array untuk objek musuh
//         let score = 0;
//         let gameOver = false;
//         let gameActive = false; // Flag untuk melacak apakah game sedang berjalan atau tidak
//         let gameLoopInterval;
//         let enemyMoveTimer; // Timer untuk pergerakan musuh
//         let enemyDirection = 1; // 1 = kanan, -1 = kiri

//         // --- Sprite Musuh ---
//         const enemySpriteImage = new Image();
//         // Pastikan nama file sesuai dengan yang Anda unggah
//         enemySpriteImage.src = 'space-inv-sprites.png';

//         // Definisi sprite (sx, sy, sWidth, sHeight) dari gambar space-inv-sprites.png
//         // Asumsi setiap sprite berukuran sekitar 24x16 piksel
//         const enemySpriteData = [
//           { sx: 0, sy: 0, sWidth: 24, sHeight: 16 },   // Baris 1
//           { sx: 0, sy: 25, sWidth: 24, sHeight: 16 },  // Baris 2
//           { sx: 0, sy: 50, sWidth: 24, sHeight: 16 },  // Baris 3
//           { sx: 0, sy: 75, sWidth: 24, sHeight: 16 },  // Baris 4
//           { sx: 0, sy: 100, sWidth: 24, sHeight: 16 }, // Baris 5
//           // Tambahkan lebih banyak jika ada baris sprite lain
//         ];
//         // --- Akhir Sprite Musuh ---

//         // Fungsi untuk mengatur dimensi canvas
//         function setInitialCanvasSize() {
//           // Canvas akan mengambil lebar penuh dari container dan tinggi yang proporsional
//           canvasWidth = container.clientWidth - (10 * 2); // 10px padding * 2 sisi
//           // Sesuaikan tinggi canvas dengan memperhitungkan scoreEl dan controlsContainer
//           canvasHeight = container.clientHeight - scoreEl.offsetHeight - controlsContainer.offsetHeight - (10 * 4);

//           canvas.width = Math.max(300, canvasWidth); // Minimal 300px
//           canvas.height = Math.max(300, canvasHeight); // Minimal 300px

//           // Sesuaikan posisi pemain ke tengah bawah canvas
//           player.x = canvas.width / 2 - player.width / 2;
//           player.y = canvas.height - player.height - 20; // 20px dari bawah

//           console.log(`Canvas initialized to: ${canvas.width}x${canvas.height}`);
//         }

//         // Memastikan controlsContainer sudah ada sebelum digunakan
//         const controlsContainer = document.querySelector(`.controls-container[data-uuid="${uuid}"]`) || document.createElement('div');


//         // Fungsi untuk menginisialisasi atau mereset game
//         function initializeGame() {
//           setInitialCanvasSize(); // Setel ulang ukuran canvas saat game dimulai/di-restart

//           player.x = canvas.width / 2 - player.width / 2;
//           player.y = canvas.height - player.height - 20;
//           player.movingLeft = false;
//           player.movingRight = false;
//           player.canShoot = true; // Set canShoot ke true di awal
//           player.lastShotTime = 0;

//           bullets = [];
//           enemies = [];
//           score = 0;
//           scoreEl.textContent = score;
//           gameOver = false;
//           gameActive = true;
//           enemyDirection = 1; // Reset arah musuh

//           // Buat musuh
//           for (let r = 0; r < ENEMY_ROWS; r++) {
//             for (let c = 0; c < ENEMY_COLS; c++) {
//               enemies.push({
//                 x: INITIAL_ENEMY_OFFSET_X + c * ENEMY_SPACING_X,
//                 y: INITIAL_ENEMY_OFFSET_Y + r * ENEMY_SPACING_Y,
//                 width: 30, // Sesuaikan lebar musuh dengan ukuran sprite atau yang Anda inginkan
//                 height: 20, // Sesuaikan tinggi musuh dengan ukuran sprite atau yang Anda inginkan
//                 isAlive: true,
//                 spriteIndex: r % enemySpriteData.length // Gunakan sprite berdasarkan baris
//               });
//             }
//           }

//           hideGameMessage();
//           draw(); // Gambar state awal game

//           // Hentikan interval lama jika ada
//           if (gameLoopInterval) {
//             clearInterval(gameLoopInterval);
//           }
//           if (enemyMoveTimer) {
//             clearInterval(enemyMoveTimer);
//           }

//           gameLoopInterval = setInterval(gameLoop, 1000 / 60); // 60 FPS
//           enemyMoveTimer = setInterval(moveEnemies, ENEMY_MOVE_INTERVAL); // Atur timer pergerakan musuh

//           // Penting: Matikan image smoothing untuk tampilan piksel yang kasar
//           ctx.imageSmoothingEnabled = false;
//         }

//         // Fungsi untuk menampilkan pesan game
//         function showGameMessage(message) {
//           gameMessageEl.textContent = message;
//           gameMessageEl.style.display = 'block';
//           gameActive = false; // Hentikan game
//           clearInterval(gameLoopInterval);
//           clearInterval(enemyMoveTimer);
//         }

//         // Fungsi untuk menyembunyikan pesan game
//         function hideGameMessage() {
//           gameMessageEl.style.display = 'none';
//         }

//         // Fungsi untuk menggambar semua elemen game
//         function draw() {
//           ctx.clearRect(0, 0, canvas.width, canvas.height); // Bersihkan canvas

//           // Gambar latar belakang luar angkasa (opsional, bisa diganti gambar/pola)
//           ctx.fillStyle = '#000';
//           ctx.fillRect(0, 0, canvas.width, canvas.height);

//           // Gambar pemain
//           ctx.fillStyle = '#00ff00'; // Hijau terang
//           ctx.fillRect(player.x, player.y, player.width, player.height);

//           // Gambar peluru pemain
//           ctx.fillStyle = '#ffff00'; // Kuning terang
//           bullets.forEach(bullet => {
//             ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
//           });

//           // Gambar musuh (sekarang menggunakan sprite)
//           enemies.forEach(enemy => {
//             if (enemy.isAlive) {
//               const sprite = enemySpriteData[enemy.spriteIndex];
//               // Pastikan gambar sudah dimuat sebelum digambar
//               if (enemySpriteImage.complete && enemySpriteImage.naturalWidth !== 0) {
//                 ctx.drawImage(
//                   enemySpriteImage,
//                   sprite.sx, sprite.sy, sprite.sWidth, sprite.sHeight, // Sumber dari sprite sheet
//                   enemy.x, enemy.y, enemy.width, enemy.height // Tujuan di canvas
//                 );
//               } else {
//                 // Fallback jika gambar belum dimuat (gambar kotak merah)
//                 ctx.fillStyle = '#ff0000';
//                 ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
//               }
//             }
//           });
//         }

//         // Fungsi untuk memperbarui status game
//         function update() {
//           if (!gameActive || gameOver) return;

//           // Pergerakan pemain
//           if (player.movingLeft && player.x > 0) {
//             player.x -= PLAYER_SPEED;
//           }
//           if (player.movingRight && player.x + player.width < canvas.width) {
//             player.x += PLAYER_SPEED;
//           }

//           // Pergerakan peluru pemain
//           for (let i = bullets.length - 1; i >= 0; i--) {
//             bullets[i].y -= PLAYER_BULLET_SPEED;
//             // Hapus peluru yang keluar layar
//             if (bullets[i].y < 0) {
//               bullets.splice(i, 1);
//             }
//           }

//           // Deteksi tumbukan peluru pemain dengan musuh
//           bullets.forEach((bullet, bIndex) => {
//             enemies.forEach((enemy, eIndex) => {
//               if (enemy.isAlive &&
//                 bullet.x < enemy.x + enemy.width &&
//                 bullet.x + bullet.width > enemy.x &&
//                 bullet.y < enemy.y + enemy.height &&
//                 bullet.y + bullet.height > enemy.y) {

//                 // Tumbukan! Hapus peluru dan tandai musuh mati
//                 bullets.splice(bIndex, 1);
//                 enemy.isAlive = false;
//                 score += 10; // Tambah skor
//                 scoreEl.textContent = score;
//               }
//             });
//           });

//           // Periksa kondisi menang
//           if (enemies.every(enemy => !enemy.isAlive)) {
//             gameOver = true;
//             showGameMessage('ANDA MENANG!\nSkor: ' + score + '\nTekan Restart untuk Main Lagi');
//             actionButton.textContent = 'Restart Game';
//           }

//           // Periksa kondisi kalah (musuh mencapai bawah)
//           enemies.forEach(enemy => {
//             if (enemy.isAlive && enemy.y + enemy.height >= player.y) {
//               gameOver = true;
//               showGameMessage('GAME OVER!\nMusuh Mencapai Bumi!\nSkor: ' + score + '\nTekan Restart untuk Main Lagi');
//               actionButton.textContent = 'Restart Game';
//             }
//           });
//         }

//         // Fungsi pergerakan musuh
//         function moveEnemies() {
//           if (!gameActive || gameOver) return;

//           let anyEnemyAtEdge = false;
//           enemies.forEach(enemy => {
//             if (enemy.isAlive) {
//               if (enemyDirection === 1 && enemy.x + enemy.width > canvas.width - 20) { // Dekat batas kanan
//                 anyEnemyAtEdge = true;
//               } else if (enemyDirection === -1 && enemy.x < 20) { // Dekat batas kiri
//                 anyEnemyAtEdge = true;
//               }
//             }
//           });

//           if (anyEnemyAtEdge) {
//             enemyDirection *= -1; // Balik arah horizontal
//             enemies.forEach(enemy => {
//               enemy.y += ENEMY_SPEED_Y; // Gerak ke bawah
//             });
//           } else {
//             enemies.forEach(enemy => {
//               enemy.x += ENEMY_SPEED_X * enemyDirection; // Gerak horizontal
//             });
//           }
//         }

//         // Main game loop
//         function gameLoop() {
//           update();
//           draw();
//         }

//         // Event listener untuk input keyboard
//         document.addEventListener('keydown', function (e) {
//           if (!gameActive || gameOver) return;

//           if (e.key === 'ArrowLeft') {
//             player.movingLeft = true;
//           } else if (e.key === 'ArrowRight') {
//             player.movingRight = true;
//           } else if (e.key === ' ') { // Cukup cek spasi, player.canShoot dicek di dalam
//             const currentTime = Date.now();
//             if (player.canShoot && (currentTime - player.lastShotTime >= BULLET_COOLDOWN)) {
//               bullets.push({
//                 x: player.x + player.width / 2 - 2, // Tengah pemain
//                 y: player.y,
//                 width: 4,
//                 height: 10
//               });
//               player.canShoot = false; // Nonaktifkan tembak
//               player.lastShotTime = currentTime; // Catat waktu tembakan

//               // Atur timer untuk mengaktifkan kembali tembak setelah cooldown
//               setTimeout(() => {
//                 player.canShoot = true;
//               }, BULLET_COOLDOWN);
//             }
//           }
//         });

//         document.addEventListener('keyup', function (e) {
//           if (!gameActive || gameOver) return;

//           if (e.key === 'ArrowLeft') {
//             player.movingLeft = false;
//           } else if (e.key === 'ArrowRight') {
//             player.movingRight = false;
//           }
//           // Logika untuk player.canShoot pada keyup dihapus
//         });

//         // Fungsi untuk memulai game dari tombol
//         function startGame() {
//           initializeGame();
//           actionButton.textContent = 'Restart Game';
//           actionButton.blur(); // Hapus fokus dari tombol untuk mencegah trigger spasi
//         }

//         // Atur teks tombol awal
//         actionButton.textContent = 'Start Game';

//         // Event listener untuk tombol Start/Restart
//         actionButton.addEventListener('click', startGame);

//         // Gambar state awal (diam) saat aplikasi dimuat
//         initializeGame();
//         gameActive = false; // Pastikan game tidak langsung jalan
//         clearInterval(gameLoopInterval);
//         clearInterval(enemyMoveTimer);
//         gameMessageEl.textContent = 'Tekan Start Game untuk Mulai!\n(Panah Kiri/Kanan untuk Gerak, Spasi untuk Tembak)';
//         gameMessageEl.style.display = 'block';
//       }
//     };
//   }
// };



module.exports = {
  application: (uuid) => {
    let appName = "spaceinvaders";
    let appTitle = "Space Invaders";

    return {
      header: {
        appName,
        appTitle,
        version: "1.0",
        uuid,
        active: true,
        iconSmall: "icon_16_app.png",
        iconMedium: "icon_22_app.png",
        iconLarge: "icon_32_app.png",
        resizable: true,
        width: 700, // Lebar aplikasi
        height: 650 // Tinggi aplikasi
      },
      content: `
        <style type="text/css">
          .main-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 10px;
            height: 100%;
            box-sizing: border-box;
            font-family: 'Inter', sans-serif;
            background-color: #0d0d0d; /* Darker background for space theme */
            position: relative;
            overflow: hidden; /* Prevent content from overflowing */
          }
          canvas.game-canvas {
            background: #000; /* Black for space */
            display: block;
            margin: 10px auto;
            border: 2px solid #00f; /* Blue border for sci-fi feel */
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(0, 0, 255, 0.7); /* Glowing blue effect */
            max-width: 100%;
            width: 90%;
            height: 440px;
          }
          .game-score {
            color: #00ff00; /* Bright green for score */
            text-align: center;
            font-family: monospace;
            font-size: 24px;
            margin-bottom: 15px;
            text-shadow: 0 0 8px #00ff00;
            font-weight: bold;
          }
          .game-message {
            color: #FFFF00; /* Yellow for messages */
            text-align: center;
            font-family: 'Inter', sans-serif;
            font-size: 32px; /* Larger font for messages */
            font-weight: bold;
            text-shadow: 0 0 10px rgba(255, 255, 0, 0.8);
            position: absolute;
            top: calc(50% + 0px); /* Menggeser pesan ke bawah 50px */
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.8); /* Semi-transparent black background */
            padding: 20px 40px;
            border-radius: 12px;
            display: none;
            z-index: 10;
            line-height: 1.4;
          }
          .controls-container {
            margin-top: 20px;
            text-align: center;
          }
          .action-button {
            background-color: #007bff; /* Blue button */
            color: white;
            padding: 15px 30px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 20px;
            font-weight: bold;
            box-shadow: 0 5px 15px rgba(0, 123, 255, 0.4);
            transition: background-color 0.3s ease, box-shadow 0.3s ease, transform 0.1s ease;
          }
          .action-button:hover {
            background-color: #0056b3; /* Darker blue on hover */
            box-shadow: 0 8px 20px rgba(0, 123, 255, 0.6);
          }
          .action-button:active {
            background-color: #004085;
            box-shadow: 0 2px 5px rgba(0, 123, 255, 0.3);
            transform: translateY(2px);
          }

          @media (max-width: 768px) {
            .game-score {
              font-size: 20px;
            }
            .game-message {
              font-size: 26px;
              padding: 15px 30px;
              top: calc(50% + 40px); /* Adjusted for smaller screens */
            }
            .action-button {
              padding: 12px 25px;
              font-size: 18px;
            }
          }
          @media (max-width: 480px) {
            .game-score {
              font-size: 18px;
            }
            .game-message {
              font-size: 22px;
              padding: 10px 20px;
              top: calc(50% + 30px); /* Adjusted for even smaller screens */
            }
            .action-button {
              padding: 10px 20px;
              font-size: 16px;
            }
          }
        </style>
        <div class="main-container" data-app="${appName}" data-uuid="${uuid}">
          <div class="game-score">Score: <span id="game-score-${uuid}">0</span></div>
          <canvas class="game-canvas" id="game-canvas-${uuid}"></canvas>
          <div class="game-message" id="game-message-${uuid}"></div>
          <div class="controls-container">
            <button id="action-button-${uuid}" class="action-button">Start Game</button>
          </div>
        </div>` ,
      main: (sender, nos) => {
        // Logika backend opsional (sisi NOS)
      },
      jsContent: (app) => {
        // Logika game Space Invaders
        const uuid = app.header.uuid;
        const container = document.querySelector(`.main-container[data-uuid="${uuid}"]`);
        const canvas = document.getElementById(`game-canvas-${uuid}`);
        const ctx = canvas.getContext('2d');
        const scoreEl = document.getElementById(`game-score-${uuid}`);
        const gameMessageEl = document.getElementById(`game-message-${uuid}`);
        const actionButton = document.getElementById(`action-button-${uuid}`);

        // --- Konstanta Game untuk Tuning ---
        const PLAYER_SPEED = 2; // Kecepatan gerakan pemain (pixel per frame)
        const PLAYER_BULLET_SPEED = 7; // Kecepatan peluru pemain (pixel per frame)
        const ENEMY_SPEED_X = 4; // Kecepatan horizontal musuh
        const ENEMY_SPEED_Y = 20; // Seberapa jauh musuh bergerak ke bawah saat mencapai batas
        const ENEMY_MOVE_INTERVAL = 300; // Interval gerakan musuh (ms)
        const ENEMY_ROWS = 5; // Jumlah baris musuh
        const ENEMY_COLS = 8; // Jumlah kolom musuh
        const ENEMY_SPACING_X = 50; // Jarak horizontal antar musuh
        const ENEMY_SPACING_Y = 40; // Jarak vertikal antar musuh
        const INITIAL_ENEMY_OFFSET_X = 50; // Offset awal X untuk grid musuh
        const INITIAL_ENEMY_OFFSET_Y = 30; // Offset awal Y untuk grid musuh
        const BULLET_COOLDOWN = 300; // Cooldown tembak pemain (ms)
        // --- Akhir Konstanta Game ---

        let canvasWidth, canvasHeight;

        // Objek Game State
        let player = {
          x: 0,
          y: 0,
          width: 40,
          height: 20,
          movingLeft: false,
          movingRight: false,
          canShoot: true,
          lastShotTime: 0
        };
        let bullets = []; // Array untuk peluru pemain
        let enemies = []; // Array untuk objek musuh
        let score = 0;
        let gameOver = false;
        let gameActive = false; // Flag untuk melacak apakah game sedang berjalan atau tidak
        let gameLoopInterval;
        let enemyMoveTimer; // Timer untuk pergerakan musuh
        let enemyDirection = 1; // 1 = kanan, -1 = kiri

        // Fungsi untuk mengatur dimensi canvas
        function setInitialCanvasSize() {
          // Canvas akan mengambil lebar penuh dari container dan tinggi yang proporsional
          canvasWidth = container.clientWidth - (10 * 2); // 10px padding * 2 sisi
          // Sesuaikan tinggi canvas dengan memperhitungkan scoreEl dan controlsContainer
          canvasHeight = container.clientHeight - scoreEl.offsetHeight - controlsContainer.offsetHeight - (10 * 4);

          canvas.width = Math.max(300, canvasWidth); // Minimal 300px
          canvas.height = Math.max(300, canvasHeight); // Minimal 300px

          // Sesuaikan posisi pemain ke tengah bawah canvas
          player.x = canvas.width / 2 - player.width / 2;
          player.y = canvas.height - player.height - 20; // 20px dari bawah

          console.log(`Canvas initialized to: ${canvas.width}x${canvas.height}`);
        }

        // Memastikan controlsContainer sudah ada sebelum digunakan
        const controlsContainer = document.querySelector(`.controls-container[data-uuid="${uuid}"]`) || document.createElement('div');


        // Fungsi untuk menginisialisasi atau mereset game
        function initializeGame() {
          setInitialCanvasSize(); // Setel ulang ukuran canvas saat game dimulai/di-restart

          player.x = canvas.width / 2 - player.width / 2;
          player.y = canvas.height - player.height - 20;
          player.movingLeft = false;
          player.movingRight = false;
          player.canShoot = true; // Set canShoot ke true di awal
          player.lastShotTime = 0;

          bullets = [];
          enemies = [];
          score = 0;
          scoreEl.textContent = score;
          gameOver = false;
          gameActive = true;
          enemyDirection = 1; // Reset arah musuh

          // Buat musuh
          for (let r = 0; r < ENEMY_ROWS; r++) {
            for (let c = 0; c < ENEMY_COLS; c++) {
              enemies.push({
                x: INITIAL_ENEMY_OFFSET_X + c * ENEMY_SPACING_X,
                y: INITIAL_ENEMY_OFFSET_Y + r * ENEMY_SPACING_Y,
                width: 30,
                height: 20,
                isAlive: true
              });
            }
          }

          hideGameMessage();
          draw(); // Gambar state awal game

          // Hentikan interval lama jika ada
          if (gameLoopInterval) {
            clearInterval(gameLoopInterval);
          }
          if (enemyMoveTimer) {
            clearInterval(enemyMoveTimer);
          }

          gameLoopInterval = setInterval(gameLoop, 1000 / 60); // 60 FPS
          enemyMoveTimer = setInterval(moveEnemies, ENEMY_MOVE_INTERVAL); // Atur timer pergerakan musuh
        }

        // Fungsi untuk menampilkan pesan game
        function showGameMessage(message) {
          gameMessageEl.textContent = message;
          gameMessageEl.style.display = 'block';
          gameActive = false; // Hentikan game
          clearInterval(gameLoopInterval);
          clearInterval(enemyMoveTimer);
        }

        // Fungsi untuk menyembunyikan pesan game
        function hideGameMessage() {
          gameMessageEl.style.display = 'none';
        }

        // Fungsi untuk menggambar semua elemen game
        function draw() {
          ctx.clearRect(0, 0, canvas.width, canvas.height); // Bersihkan canvas

          // Gambar latar belakang luar angkasa (opsional, bisa diganti gambar/pola)
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Gambar pemain
          ctx.fillStyle = '#00ff00'; // Hijau terang
          ctx.fillRect(player.x, player.y, player.width, player.height);

          // Gambar peluru pemain
          ctx.fillStyle = '#ffff00'; // Kuning terang
          bullets.forEach(bullet => {
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
          });

          // Gambar musuh
          ctx.fillStyle = '#ff0000'; // Merah
          enemies.forEach(enemy => {
            if (enemy.isAlive) {
              ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }
          });
        }

        // Fungsi untuk memperbarui status game
        function update() {
          if (!gameActive || gameOver) return;

          // Pergerakan pemain
          if (player.movingLeft && player.x > 0) {
            player.x -= PLAYER_SPEED;
          }
          if (player.movingRight && player.x + player.width < canvas.width) {
            player.x += PLAYER_SPEED;
          }

          // Pergerakan peluru pemain
          for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].y -= PLAYER_BULLET_SPEED;
            // Hapus peluru yang keluar layar
            if (bullets[i].y < 0) {
              bullets.splice(i, 1);
            }
          }

          // Deteksi tumbukan peluru pemain dengan musuh
          bullets.forEach((bullet, bIndex) => {
            enemies.forEach((enemy, eIndex) => {
              if (enemy.isAlive &&
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {

                // Tumbukan! Hapus peluru dan tandai musuh mati
                bullets.splice(bIndex, 1);
                enemy.isAlive = false;
                score += 10; // Tambah skor
                scoreEl.textContent = score;
              }
            });
          });

          // Periksa kondisi menang
          if (enemies.every(enemy => !enemy.isAlive)) {
            gameOver = true;
            showGameMessage('ANDA MENANG!\nSkor: ' + score + '\nTekan Restart untuk Main Lagi');
            actionButton.textContent = 'Restart Game';
          }

          // Periksa kondisi kalah (musuh mencapai bawah)
          enemies.forEach(enemy => {
            if (enemy.isAlive && enemy.y + enemy.height >= player.y) {
              gameOver = true;
              showGameMessage('GAME OVER!\nMusuh Mencapai Bumi!\nSkor: ' + score + '\nTekan Restart untuk Main Lagi');
              actionButton.textContent = 'Restart Game';
            }
          });
        }

        // Fungsi pergerakan musuh
        function moveEnemies() {
          if (!gameActive || gameOver) return;

          let anyEnemyAtEdge = false;
          enemies.forEach(enemy => {
            if (enemy.isAlive) {
              if (enemyDirection === 1 && enemy.x + enemy.width > canvas.width - 20) { // Dekat batas kanan
                anyEnemyAtEdge = true;
              } else if (enemyDirection === -1 && enemy.x < 20) { // Dekat batas kiri
                anyEnemyAtEdge = true;
              }
            }
          });

          if (anyEnemyAtEdge) {
            enemyDirection *= -1; // Balik arah horizontal
            enemies.forEach(enemy => {
              enemy.y += ENEMY_SPEED_Y; // Gerak ke bawah
            });
          } else {
            enemies.forEach(enemy => {
              enemy.x += ENEMY_SPEED_X * enemyDirection; // Gerak horizontal
            });
          }
        }

        // Main game loop
        function gameLoop() {
          update();
          draw();
        }

        // Event listener untuk input keyboard
        document.addEventListener('keydown', function (e) {
          if (!gameActive || gameOver) return;

          if (e.key === 'ArrowLeft') {
            player.movingLeft = true;
          } else if (e.key === 'ArrowRight') {
            player.movingRight = true;
          } else if (e.key === ' ') { // Cukup cek spasi, player.canShoot dicek di dalam
            const currentTime = Date.now();
            if (player.canShoot && (currentTime - player.lastShotTime >= BULLET_COOLDOWN)) {
              bullets.push({
                x: player.x + player.width / 2 - 2, // Tengah pemain
                y: player.y,
                width: 4,
                height: 10
              });
              player.canShoot = false; // Nonaktifkan tembak
              player.lastShotTime = currentTime; // Catat waktu tembakan

              // Atur timer untuk mengaktifkan kembali tembak setelah cooldown
              setTimeout(() => {
                player.canShoot = true;
              }, BULLET_COOLDOWN);
            }
          }
        });

        document.addEventListener('keyup', function (e) {
          if (!gameActive || gameOver) return;

          if (e.key === 'ArrowLeft') {
            player.movingLeft = false;
          } else if (e.key === 'ArrowRight') {
            player.movingRight = false;
          }
          // Logika untuk player.canShoot pada keyup dihapus
        });

        // Fungsi untuk memulai game dari tombol
        function startGame() {
          initializeGame();
          actionButton.textContent = 'Restart Game';
          actionButton.blur(); // Hapus fokus dari tombol untuk mencegah trigger spasi
        }

        // Atur teks tombol awal
        actionButton.textContent = 'Start Game';

        // Event listener untuk tombol Start/Restart
        actionButton.addEventListener('click', startGame);

        // Gambar state awal (diam) saat aplikasi dimuat
        initializeGame();
        gameActive = false; // Pastikan game tidak langsung jalan
        clearInterval(gameLoopInterval);
        clearInterval(enemyMoveTimer);
        gameMessageEl.textContent = 'Tekan Start Game untuk Mulai!\n(Panah Kiri/Kanan untuk Gerak, Spasi untuk Tembak)';
        gameMessageEl.style.display = 'block';
      }
    };
  }
};
