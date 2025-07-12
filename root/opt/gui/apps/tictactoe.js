module.exports.application = () => ({
  header: {
    appName: "tictactoe",
    version: "1.1",
    appTitle: "Tic Tac Toe",
    active: true,
    iconSmall: "icon_16_star.png",
    iconMedium: "icon_22_star.png",
    iconLarge: "icon_32_app.png",
    width: 360,
    height: 450,
    resizable: true,
  },
  content: `
    <div id="tictactoe-wrapper" class="flex flex-col items-center justify-center gap-2 p-4">
      <canvas id="tictactoe-canvas" width="300" height="300" class="border"></canvas>
      <div id="tictactoe-status" class="text-sm h-6">Your turn (X)</div>
      <button id="tictactoe-reset" class="border px-3 py-1 rounded bg-blue-600 text-gray">Restart</button>
    </div>
  `,
  main: () => { },
  jsContent: (app) => {
    const canvas = document.getElementById("tictactoe-canvas");
    const ctx = canvas.getContext("2d");
    const size = 300;
    const cellSize = size / 3;
    const board = Array(9).fill(null);
    let currentPlayer = "X";
    let gameOver = false;
    let winningLine = null;

    const winPatterns = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    const getCellIndex = (x, y) => {
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      return row * 3 + col;
    };

    const drawBoard = () => {
      ctx.clearRect(0, 0, size, size);
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;

      for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, size);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(size, i * cellSize);
        ctx.stroke();
      }

      for (let i = 0; i < 9; i++) {
        const val = board[i];
        if (val) {
          const x = (i % 3) * cellSize;
          const y = Math.floor(i / 3) * cellSize;
          ctx.font = "bold 48px Arial";
          ctx.fillStyle = val === "X" ? "blue" : "red";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(val, x + cellSize / 2, y + cellSize / 2);
        }
      }

      if (winningLine && gameOver) {
        const [a, b, c] = winningLine;
        const x1 = ((a % 3) + 0.5) * cellSize;
        const y1 = (Math.floor(a / 3) + 0.5) * cellSize;
        const x2 = ((c % 3) + 0.5) * cellSize;
        const y2 = (Math.floor(c / 3) + 0.5) * cellSize;

        ctx.strokeStyle = "green";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };

    const checkWinner = () => {
      for (const [a, b, c] of winPatterns) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          winningLine = [a, b, c];
          return board[a];
        }
      }
      if (board.every(cell => cell)) return "draw";
      return null;
    };

    const updateStatus = (msg) => {
      document.getElementById("tictactoe-status").innerText = msg;
    };

    const animateWin = () => {
      let flash = true;
      const interval = setInterval(() => {
        if (!gameOver || !winningLine) {
          clearInterval(interval);
          return;
        }
        ctx.globalAlpha = flash ? 1 : 0.3;
        drawBoard();
        flash = !flash;
      }, 300);
    };

    const finalizeTurn = () => {
      drawBoard();
      const winner = checkWinner();
      if (winner === "X") {
        updateStatus("You win!");
        gameOver = true;
        animateWin();
      } else if (winner === "O") {
        updateStatus("CPU wins!");
        gameOver = true;
        animateWin();
      } else if (winner === "draw") {
        updateStatus("Draw!");
        gameOver = true;
      } else {
        currentPlayer = "X";
        updateStatus("Your turn (X)");
      }
    };

    const cpuMove = () => {
      if (gameOver) return;

      for (let i = 0; i < 9; i++) {
        if (!board[i]) {
          board[i] = "O";
          if (checkWinner() === "O") return finalizeTurn();
          board[i] = null;
        }
      }

      for (let i = 0; i < 9; i++) {
        if (!board[i]) {
          board[i] = "X";
          if (checkWinner() === "X") {
            board[i] = "O";
            return finalizeTurn();
          }
          board[i] = null;
        }
      }

      const empty = board.map((v, i) => v ? null : i).filter(v => v !== null);
      if (empty.length > 0) {
        const choice = empty[Math.floor(Math.random() * empty.length)];
        board[choice] = "O";
        finalizeTurn();
      }
    };

    canvas.addEventListener("click", (e) => {
      if (gameOver || currentPlayer !== "X") return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const index = getCellIndex(x, y);
      if (!board[index]) {
        board[index] = "X";
        drawBoard();
        const winner = checkWinner();
        if (winner === "X") {
          updateStatus("You win!");
          gameOver = true;
          animateWin();
        } else if (winner === "draw") {
          updateStatus("Draw!");
          gameOver = true;
        } else {
          currentPlayer = "O";
          updateStatus("CPU thinking...");
          setTimeout(cpuMove, 100 + Math.random() * 1000);
        }
      }
    });

    document.getElementById("tictactoe-reset").addEventListener("click", () => {
      for (let i = 0; i < 9; i++) board[i] = null;
      gameOver = false;
      currentPlayer = "X";
      winningLine = null;
      ctx.globalAlpha = 1;
      drawBoard();
      if (Math.random() >= .5) cpuMove();
      updateStatus("Your turn (X)");
    });

    drawBoard();
    if (Math.random() >= .5) cpuMove();
  }
});
