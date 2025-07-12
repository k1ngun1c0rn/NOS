const Database = require("better-sqlite3");
const path = require("path");
const os = require("os");
const fsx = require("fs");
const crypto = require("crypto");
const requireFromString = require('require-from-string');

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

class NOSFileSystemDriver {
  constructor(dbPath = "nos_filesystem.sqlite") {
    this.dbPath = dbPath;
    this.db = null; // Akan diinisialisasi saat open()
    this.name = "bfsAccess"; // Nama driver baru
    this.devClass = "NOS File System";
    this.version = 1.0;
    this.crt = null; // Untuk menyimpan referensi ke shell
    this.cache = {}; // Cache manual untuk modul BFS
  }

  // Metode untuk membuka koneksi database dan inisialisasi skema
  setCrt(crt) {
    this.crt = crt;
  }

  // // Mendapatkan node (file/directory) berdasarkan path
  #getNodeByPath(filePath) {
    // PATCH: handle root path
    if (filePath === "/" || filePath === "") {
      return this.db
        .prepare(
          "SELECT id, name, is_directory, content FROM files WHERE parent_id IS NULL AND name = '' AND is_directory = 1",
        )
        .get();
    }
    const parts = filePath.split("/").filter((p) => p !== "");
    let currentParentId = this.db
      .prepare(
        "SELECT id FROM files WHERE parent_id IS NULL AND name = '' AND is_directory = 1",
      )
      .get()?.id;
    if (!currentParentId && parts.length > 0) {
      return null;
    }
    let currentNode = null;
    for (let i = 0; i < parts.length; i++) {
      currentNode = this.db
        .prepare(
          "SELECT id, name, is_directory, content FROM files WHERE parent_id = ? AND name = ?",
        )
        .get(currentParentId, parts[i]);
      if (!currentNode) return null;
      currentParentId = currentNode.id;
    }
    return currentNode;
  }

  // Membaca isi file (sync)
  readFileSync(filePath, encoding = "utf8") {
    // Ubah isASCII menjadi encoding
    // console.log(`%${filePath}%`);
    const node = this.#getNodeByPath(filePath); // Menggunakan method private
    if (!node) {
      throw new Error(`File not found: ${filePath}`);
    }
    if (node.is_directory) {
      throw new Error(`${filePath} is a directory, not a file.`);
    }
    return node.content ? node.content.toString(encoding) : "";
  }

  // Membuka database yang sudah ada
  async open(dbPath, onOpen = null) {
    if (dbPath) {
      this.dbPath = dbPath;
    }
    if (this.db) {
      if (this.crt) this.crt.textOut("Database connection already open.");
      return;
    }
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma("journal_mode = WAL"); // Meningkatkan konkurensi dan keandalan

      // Buat tabel jika belum ada
      const isNewDb = !require("fs").existsSync(this.dbPath);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parent_id INTEGER, -- NULL for root
          name TEXT NOT NULL,
          is_directory BOOLEAN NOT NULL DEFAULT 0,
          content BLOB, -- Untuk file, NULL untuk direktori
          checksum TEXT, -- Tambahan field checksum
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          owner_user TEXT DEFAULT 'root',
          owner_group TEXT DEFAULT 'root',
          filemod_owner TEXT DEFAULT 'rwx',
          filemod_group TEXT DEFAULT 'rwx',
          filemod_other TEXT DEFAULT 'rwx',
          UNIQUE (parent_id, name) -- Nama unik dalam direktori yang sama
        );
      `);

      // Jika database baru, langsung buat root directory
      if (isNewDb) {
        this.db
          .prepare(
            "INSERT INTO files (parent_id, name, is_directory, content) VALUES (NULL, '', 1, NULL)",
          )
          .run();
        if (this.crt)
          this.crt.textOut("Root directory created (first time DB).\n");
      } else {
        // Pastikan ada direktori root
        const rootExists = this.db
          .prepare(
            "SELECT id FROM files WHERE parent_id IS NULL AND name = '' AND is_directory = 1",
          )
          .get();
        if (!rootExists) {
          this.db
            .prepare(
              "INSERT INTO files (parent_id, name, is_directory, content) VALUES (NULL, '', 1, NULL)",
            )
            .run();
          if (this.crt) this.crt.textOut("Root directory created.");
        }
      }
      if (onOpen) {
        onOpen(this.db);
      }
      if (this.crt)
        this.crt.textOut(`NOS File System connected to ${this.dbPath}`);
    } catch (err) {
      console.error(`Error opening NOS File System: ${err.message}`);
      throw err;
    }
  }

  // Metode untuk menutup koneksi database
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      if (this.crt) this.crt.textOut("NOS File System connection closed.");
    }
  }

  /**
   * Load a Node.js module from the BFS virtual filesystem.
   * @param {string} bfsPath - Path in BFS to the JS module file.
   * @param {object} [options] - Optional: { cleanup: true/false (default true) }
   * @returns {*} The required module exports.
   */

  // Metode untuk memuat modul dari BFS
  require(bfsPath, options = {}) {
    if (!bfsPath.endsWith(".js")) bfsPath += ".js";

    // Periksa apakah modul sudah ada di cache
    if (this.cache[bfsPath] && !options.noCache) {
      return this.cache[bfsPath];
    }

    const code = this.readFileSync(bfsPath, "utf8");
    let result;
    try {
      result = requireFromString(code);
      this.cache[bfsPath] = result; // Simpan ke cache
    } catch (error) {
      console.error(`Error requiring module from BFS: ${error.message}`);
      throw error;
    }
    return result;
  }

  // Metode untuk menghapus cache modul
  clearCache(bfsPath) {
    if (!bfsPath.endsWith(".js")) bfsPath += ".js";
    if (this.cache[bfsPath]) {
      delete this.cache[bfsPath];
      // console.log(`Cache cleared for: ${bfsPath}`);
    } else {
      // console.log(`No cache found for: ${bfsPath}`);
    }
  }

  clearCacheRecursive(bfsPath) {
    if (!bfsPath.endsWith(".js")) bfsPath += ".js";

    // Hapus cache untuk modul utama
    if (this.cache[bfsPath]) {
      delete this.cache[bfsPath];
      // console.log(`Cache cleared for: ${bfsPath}`);
    }

    // Cari dan hapus cache untuk semua dependensi
    const module = require.cache[require.resolve(bfsPath)];
    if (module && module.children) {
      module.children.forEach((child) => {
        this.clearCacheRecursive(child.id);
      });
    }

    // Hapus dari cache Node.js jika ada
    delete require.cache[require.resolve(bfsPath)];
  }

  // Metode untuk menghapus semua cache
  clearAllCache() {
    this.cache = {};
    console.log("All BFS module cache cleared.");
  }

  // require(bfsPath, options = {}) {
  //   if (!bfsPath.endsWith(".js")) bfsPath += ".js";
  //   const code = this.readFileSync(bfsPath, "utf8");
  //   let result;
  //   try {
  //     result = requireFromString(code);
  //   } catch (error) {
  //     console.error(`Error requiring module from BFS: ${error.message}`);
  //     throw error;
  //   }
  //   return result;
  // }
}

// module.exports = { NOSFileSystemDriver };

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

__APP = {};
bfs = new NOSFileSystemDriver();
bfs.fileSystemDriver = { name: "SQLite", lib: "bfs" }
let nos;

// Ambil parameter -f <file bfs>
const args = process.argv;
const bfsFileIndex = args.indexOf("-f");
const bfsFile = bfsFileIndex !== -1 && args[bfsFileIndex + 1] ? args[bfsFileIndex + 1] : "./nos.bfs";

bfs.open(bfsFile, async () => {
  const __NOS = bfs.require("/boot/core.js", { cleanup: true });
  nos = new __NOS.NOS(process.argv); // Tetap menggunakan process.argv
  try {
    nos.executeModule("/base/", "boot.js", () => { }, null, true);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
});
