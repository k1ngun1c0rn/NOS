const fs = require("fs");
const path = require("path");
const { NOSFileSystemDriver } = require("./bfs.js");

// Ambil argumen dari command line
const [, , source, bfsFile, targetPathArg] = process.argv;

if (!source || !bfsFile) {
  console.error("Usage: node bfsmig.js <source> <bfsFile> [targetPath]");
  process.exit(1);
}

// Otomatis tentukan targetPath jika tidak diisi
let targetPath = targetPathArg;
if (!targetPath) {
  // Ambil path setelah /home/bfsnos/root
  const rootPrefix = "/home/bfsnos/root";
  const idx = source.indexOf(rootPrefix);
  if (idx === -1) {
    console.error("Error: Source file must be under /home/bfsnos/root if targetPath is omitted!");
    process.exit(1);
  }
  // Path setelah /home/bfsnos/root, tanpa nama file
  const relPath = path.posix.dirname(source.slice(idx + rootPrefix.length));
  targetPath = relPath.startsWith("/") ? relPath : "/" + relPath;
}

// 1. Inisialisasi dan buka BFS
const bfs = new NOSFileSystemDriver();
bfs.open(bfsFile);

// 2. Cek apakah targetPath ada di BFS, jika tidak buat
if (!bfs.existsSync(targetPath)) {
  bfs.mkdirSync(targetPath, { recursive: true });
}

// 3. Fungsi migrasi file
function migrateFileToBFS(localFile, bfsFilePath) {
  const data = fs.readFileSync(localFile);
  bfs.writeFileSync(bfsFilePath, data);
  console.log(`Migrated file: ${bfsFilePath}`);
}

// 4. Fungsi migrasi direktori rekursif
function migrateFolderToBFS(localDir, bfsDir) {
  if (!bfs.existsSync(bfsDir)) {
    bfs.mkdirSync(bfsDir, { recursive: true });
  }
  const items = fs.readdirSync(localDir, { withFileTypes: true });
  for (const item of items) {
    const localPath = path.join(localDir, item.name);
    const bfsPath = path.posix.join(bfsDir, item.name);
    if (item.isDirectory()) {
      migrateFolderToBFS(localPath, bfsPath);
    } else if (item.isFile()) {
      migrateFileToBFS(localPath, bfsPath);
    }
  }
}

// 5. Cek apakah source adalah file atau direktori
if (fs.existsSync(source)) {
  const targetBFSPath = path.posix.join(targetPath);

  if (fs.lstatSync(source).isDirectory()) {
    // Jika source adalah direktori
    migrateFolderToBFS(source, targetBFSPath);
  } else if (fs.lstatSync(source).isFile()) {
    // Jika source adalah file
    const fileName = path.basename(source);
    const bfsFilePath = path.posix.join(targetBFSPath, fileName);
    migrateFileToBFS(source, bfsFilePath);
  } else {
    console.error("Error: Source is neither a file nor a directory!");
    process.exit(1);
  }
} else {
  console.error("Error: Source not found!");
  process.exit(1);
}

console.log("Migrasi selesai!");