const fs = require("fs");
const path = require("path");
const { NOSFileSystemDriver } = require("./bfs.js");

// Ambil argumen dari command line
const [, , bfsFile, targetDir] = process.argv;

if (!bfsFile || !targetDir) {
  console.error("Usage: node bfsextract.js <bfsFile> <targetDir>");
  process.exit(1);
}

// 1. Inisialisasi dan buka BFS
const bfs = new NOSFileSystemDriver();
bfs.open(bfsFile);

// 2. Fungsi rekursif untuk mengekstrak BFS ke direktori lokal
function extractFolderFromBFS(bfsDir, localDir) {
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  const items = bfs.readdirSync(bfsDir);
  for (const item of items) {
    const bfsPath = path.posix.join(bfsDir, item);
    const localPath = path.join(localDir, item);

    // Gunakan statSync untuk memeriksa apakah item adalah direktori atau file
    const stats = bfs.statSync(bfsPath);
    if (stats.isDirectory()) {
      extractFolderFromBFS(bfsPath, localPath);
    } else if (stats.isFile()) {
      const data = bfs.readFileSync(bfsPath);
      fs.writeFileSync(localPath, data);
      console.log(`Extracted: ${localPath}`);
    }
  }
}

// 3. Mulai ekstraksi dari root BFS
extractFolderFromBFS("/", targetDir);

console.log("Ekstraksi selesai!");