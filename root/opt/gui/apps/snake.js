module.exports = {
  application: (uuid) => {
    let appName = "snakegame"; // Mengubah appName menjadi "snakegame"
    let appTitle = "Snake Game"; // Mengubah appTitle menjadi "Snake Game"

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
        resizable: true, // Keep resizable true for the window, but canvas won't resize.
        width: 550, // Sudah cocok
        height: 580 // Mengubah height menjadi 580
      },
      content: `
        <style type="text/css">
          .main-container {
            /* Use flexbox for centering and responsive layout */
            display: flex;
            flex-direction: column;
            align-items: center; /* Center horizontally */
            justify-content: flex-start; /* Align to top, or center if using 'center' */
            padding: 10px;
            height: 100%;
            box-sizing: border-box; /* Include padding in the element's total width and height */
            font-family: 'Inter', sans-serif; /* Use Inter font */
            background-color: #1a1a1a; /* Dark background */
            position: relative; /* Needed for absolute positioning of game-message */
          }
          canvas.snake-canvas {
            background: #000; /* Black background for the game area */
            display: block;
            margin: 10px auto; /* Add some vertical margin */
            border: 2px solid #4CAF50; /* Green border */
            border-radius: 8px; /* Rounded corners for canvas */
            box-shadow: 0 0 15px rgba(0, 255, 0, 0.5); /* Glowing effect */
            max-width: 100%; /* Ensure canvas doesn't overflow */
            height: auto; /* Maintain aspect ratio */
          }
          .snake-score {
            color: #0f0;
            text-align: center;
            font-family: monospace;
            font-size: 24px; /* Larger font for score */
            margin-bottom: 15px; /* More space below score */
            text-shadow: 0 0 5px #0f0; /* Green glow for score */
            font-weight: bold;
          }
          .game-message {
            color: #FFD700; /* Gold color for game messages */
            text-align: center;
            font-family: 'Inter', sans-serif;
            font-size: 28px; /* Larger font for messages */
            font-weight: bold;
            text-shadow: 0 0 8px rgba(255, 215, 0, 0.7);
            position: absolute; /* Position message over canvas */
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.7); /* Semi-transparent background for message */
            padding: 15px 30px;
            border-radius: 10px;
            display: none; /* Hidden by default */
            z-index: 10; /* Ensure it's on top */
          }
          .controls-container {
            margin-top: 20px;
            text-align: center;
          }
          .action-button { /* Mengganti nama kelas dari restart-button */
            background-color: #4CAF50; /* Green background */
            color: white; /* White text */
            padding: 12px 25px; /* Adequate padding */
            border: none; /* No border */
            border-radius: 8px; /* Rounded corners */
            cursor: pointer; /* Pointer on hover */
            font-size: 18px; /* Larger font */
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(0, 255, 0, 0.3); /* Subtle shadow */
            transition: background-color 0.3s ease, box-shadow 0.3s ease; /* Smooth transitions */
          }
          .action-button:hover {
            background-color: #45a049; /* Darker green on hover */
            box-shadow: 0 6px 12px rgba(0, 255, 0, 0.5); /* More prominent shadow on hover */
          }
          .action-button:active {
            background-color: #3e8e41; /* Even darker green on click */
            box-shadow: 0 2px 4px rgba(0, 255, 0, 0.3); /* Smaller shadow on click */
            transform: translateY(2px); /* Slight press effect */
          }

          @media (max-width: 600px) {
            .snake-score {
              font-size: 20px;
            }
            .game-message {
              font-size: 24px;
              padding: 10px 20px;
            }
            .action-button {
              padding: 10px 20px;
              font-size: 16px;
            }
          }
        </style>
        <div class="main-container" data-app="${appName}" data-uuid="${uuid}">
          <div class="snake-score">Score: <span id="snake-score-${uuid}">0</span></div>
          <canvas class="snake-canvas" id="snake-canvas-${uuid}"></canvas>
          <div class="game-message" id="game-message-${uuid}"></div>
          <div class="controls-container">
            <button id="action-button-${uuid}" class="action-button">Start Game</button>
          </div>
        </div>` ,
      main: (sender, nos) => {
        // Optional backend logic (NOS side)
      },
      jsContent: (app) => {
        // Snake game logic
        const uuid = app.header.uuid;
        const container = document.querySelector(`.main-container[data-uuid="${uuid}"]`);
        const canvas = document.getElementById(`snake-canvas-${uuid}`);
        const ctx = canvas.getContext('2d');
        const scoreEl = document.getElementById(`snake-score-${uuid}`);
        const gameMessageEl = document.getElementById(`game-message-${uuid}`);
        const actionButton = document.getElementById(`action-button-${uuid}`);

        let box = 20; // Ukuran satu 'kotak' unit dalam game
        let margin = 10; // Margin di sekitar canvas di dalam container

        // Konstanta untuk tuning kecepatan game
        const INITIAL_GAME_SPEED = 150; // Kecepatan awal game dalam milidetik (semakin kecil semakin cepat)
        const SPEED_DECREMENT_PER_SEGMENT = 3; // Berapa milidetik kecepatan berkurang (game jadi lebih cepat) per setiap skor/segmen ular
        const MIN_GAME_SPEED = 50; // Kecepatan minimum game dalam milidetik (mencegah game terlalu cepat)

        // Fungsi untuk mengatur dimensi canvas berdasarkan lebar container induk
        function setInitialCanvasSize() {
          let parentW = container.clientWidth - (margin * 2);
          let canvasW = Math.min(parentW, 480);
          let canvasH = Math.floor(canvasW * 3 / 4);

          canvas.width = Math.floor(canvasW / box) * box;
          canvas.height = Math.floor(canvasH / box) * box;

          console.log(`Canvas diinisialisasi ke: ${canvas.width}x${canvas.height}`);
        }

        // Panggil fungsi untuk mengatur ukuran canvas hanya sekali saat dimuat
        setInitialCanvasSize();

        // Variabel status game
        let w = canvas.width;  // Lebar canvas saat ini
        let h = canvas.height; // Tinggi canvas saat ini
        let snake; // Posisi ular
        let direction; // Arah ular
        let directionQueue; // Antrian untuk input arah
        let food; // Posisi makanan
        let score; // Skor
        let gameOver; // Flag game over
        let gameLoopInterval; // Untuk menyimpan ID interval agar bisa dihapus

        // Fungsi untuk menginisialisasi atau mereset game
        function initializeGame() {
          snake = [{ x: 8, y: 8 }]; // Reset posisi ular
          direction = 'RIGHT'; // Reset arah
          directionQueue = []; // Kosongkan antrian arah
          score = 0; // Reset skor
          scoreEl.textContent = score; // Perbarui tampilan skor
          gameOver = false; // Reset flag game over

          // Hasilkan posisi makanan baru
          let newFoodX, newFoodY;
          let collisionWithSnake;
          do {
            newFoodX = Math.floor(Math.random() * (w / box));
            newFoodY = Math.floor(Math.random() * (h / box));
            collisionWithSnake = false;
            for (let i = 0; i < snake.length; i++) {
              if (newFoodX === snake[i].x && newFoodY === snake[i].y) {
                collisionWithSnake = true;
                break;
              }
            }
          } while (collisionWithSnake);
          food = { x: newFoodX, y: newFoodY };

          hideGameMessage(); // Sembunyikan pesan game over
          draw(); // Gambar ulang game state awal

          // Hentikan interval lama jika ada, lalu mulai yang baru
          if (gameLoopInterval) {
            clearInterval(gameLoopInterval);
          }
          // Mulai game loop dengan kecepatan awal
          gameLoopInterval = setInterval(gameLoop, INITIAL_GAME_SPEED);
        }

        // Fungsi untuk menampilkan pesan game
        function showGameMessage(message) {
          gameMessageEl.textContent = message;
          gameMessageEl.style.display = 'block'; // Buat pesan terlihat
        }

        // Fungsi untuk menyembunyikan pesan game
        function hideGameMessage() {
          gameMessageEl.style.display = 'none'; // Sembunyikan pesan
        }

        // Fungsi untuk menggambar segala sesuatu di canvas
        function draw() {
          ctx.fillStyle = '#000'; // Warna latar belakang game
          ctx.fillRect(0, 0, w, h);

          // Gambar ular
          for (let i = 0; i < snake.length; i++) {
            ctx.fillStyle = i === 0 ? '#0f0' : '#6f6'; // Kepala lebih hijau terang, badan lebih terang
            ctx.fillRect(snake[i].x * box, snake[i].y * box, box - 2, box - 2); // Gambar dengan sedikit batas
          }

          // Gambar makanan
          ctx.fillStyle = '#f00'; // Warna merah untuk makanan
          ctx.fillRect(food.x * box, food.y * box, box - 2, box - 2); // Gambar dengan sedikit batas
        }

        // Fungsi untuk memperbarui status game (pergerakan ular, makan makanan, game over)
        function update() {
          if (gameOver) return; // Jika game over, hentikan pembaruan

          // Ambil arah dari antrian jika ada
          if (directionQueue.length > 0) {
            const nextDirection = directionQueue.shift(); // Ambil arah pertama dari antrian
            // Pastikan ular tidak bisa langsung berbalik arah
            if (
              (nextDirection === 'LEFT' && direction !== 'RIGHT') ||
              (nextDirection === 'RIGHT' && direction !== 'LEFT') ||
              (nextDirection === 'UP' && direction !== 'DOWN') ||
              (nextDirection === 'DOWN' && direction !== 'UP')
            ) {
              direction = nextDirection;
            }
          }

          // Dapatkan posisi kepala saat ini
          let head = { x: snake[0].x, y: snake[0].y };

          // Gerakkan kepala berdasarkan arah saat ini
          if (direction === 'LEFT') head.x--;
          if (direction === 'RIGHT') head.x++;
          if (direction === 'UP') head.y--;
          if (direction === 'DOWN') head.y++;

          // Periksa kondisi game over
          // 1. Tabrakan dinding
          if (head.x < 0 || head.x >= w / box || head.y < 0 || head.y >= h / box) {
            gameOver = true;
            showGameMessage('Game Over! Skor: ' + score + '\n Tekan Restart untuk Main Lagi');
            clearInterval(gameLoopInterval); // Hentikan game loop
            actionButton.textContent = 'Restart Game'; // Ubah teks tombol menjadi Restart
            return;
          }

          // 2. Tabrakan diri sendiri (ular memakan badannya sendiri)
          for (let i = 1; i < snake.length; i++) { // Mulai dari 1 untuk melewatkan pemeriksaan kepala dengan dirinya sendiri
            if (head.x === snake[i].x && head.y === snake[i].y) {
              gameOver = true;
              showGameMessage('Game Over! Skor: ' + score + '\n Tekan Restart untuk Main Lagi');
              clearInterval(gameLoopInterval); // Hentikan game loop
              actionButton.textContent = 'Restart Game'; // Ubah teks tombol menjadi Restart
              return;
            }
          }

          // Periksa apakah ular memakan makanan
          if (head.x === food.x && head.y === food.y) {
            score++; // Tingkatkan skor
            scoreEl.textContent = score; // Perbarui tampilan skor

            // Hasilkan posisi makanan baru, pastikan tidak berada di badan ular
            let newFoodX, newFoodY;
            let collisionWithSnake;
            do {
              newFoodX = Math.floor(Math.random() * (w / box));
              newFoodY = Math.floor(Math.random() * (h / box));
              collisionWithSnake = false;
              for (let i = 0; i < snake.length; i++) {
                if (newFoodX === snake[i].x && newFoodY === snake[i].y) {
                  collisionWithSnake = true;
                  break;
                }
              }
            } while (collisionWithSnake);
            food = { x: newFoodX, y: newFoodY };

            // === Perubahan untuk kecepatan linear ===
            // Hentikan interval saat ini
            clearInterval(gameLoopInterval);
            // Hitung kecepatan baru (semakin rendah milidetik, semakin cepat)
            const newSpeed = Math.max(MIN_GAME_SPEED, INITIAL_GAME_SPEED - (score * SPEED_DECREMENT_PER_SEGMENT));
            // Mulai ulang interval dengan kecepatan baru
            gameLoopInterval = setInterval(gameLoop, newSpeed);
            // =====================================

          } else {
            // Jika tidak ada makanan yang dimakan, hapus ekor untuk mensimulasikan gerakan
            snake.pop();
          }

          // Tambahkan kepala baru ke awal array ular
          snake.unshift(head);
        }

        // Main game loop
        function gameLoop() {
          update(); // Perbarui status game
          draw();   // Gambar ulang semuanya
        }

        // Event listener untuk input keyboard
        document.addEventListener('keydown', function (e) {
          // Hanya izinkan input jika game tidak over dan game sudah dimulai
          if (gameOver || !gameLoopInterval) return;

          let newDirection = '';
          if (e.key === 'ArrowLeft') newDirection = 'LEFT';
          else if (e.key === 'ArrowUp') newDirection = 'UP';
          else if (e.key === 'ArrowRight') newDirection = 'RIGHT';
          else if (e.key === 'ArrowDown') newDirection = 'DOWN';

          // Tambahkan arah baru ke antrian jika valid dan tidak langsung berbalik arah
          if (newDirection && directionQueue.length < 2) {
            const lastDirectionInQueue = directionQueue.length > 0 ? directionQueue[directionQueue.length - 1] : direction;
            if (
              (newDirection === 'LEFT' && lastDirectionInQueue !== 'RIGHT') ||
              (newDirection === 'RIGHT' && lastDirectionInQueue !== 'LEFT') ||
              (newDirection === 'UP' && lastDirectionInQueue !== 'DOWN') ||
              (newDirection === 'DOWN' && lastDirectionInQueue !== 'UP')
            ) {
              directionQueue.push(newDirection);
            }
          }
        });

        // Fungsi untuk memulai game
        function startGame() {
          initializeGame(); // Panggil fungsi inisialisasi
          actionButton.textContent = 'Restart Game'; // Ubah teks tombol menjadi "Restart Game"
        }

        // Atur teks tombol awal
        actionButton.textContent = 'Start Game';

        // Event listener untuk tombol Start/Restart
        actionButton.addEventListener('click', startGame);

        // Gambar state awal (ular tidak bergerak) saat aplikasi dimuat
        // initializeGame dipanggil di sini untuk menggambar ular dan makanan di posisi awal
        // tetapi gameLoopInterval segera dihentikan untuk menunggu tombol Start Game ditekan.
        initializeGame();
        clearInterval(gameLoopInterval); // Hentikan game loop agar tidak jalan otomatis saat pertama kali dimuat
        gameMessageEl.textContent = 'Tekan Start Game untuk Mulai!'; // Tampilkan pesan awal
        gameMessageEl.style.display = 'block';
      }
    };
  }
};
