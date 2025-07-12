const Database = require("better-sqlite3");
const path = require("path");
const os = require("os");
const fsx = require("fs");
const crypto = require("crypto");
const fsnative = require("fs"); // Untuk native passthrough
const { dir } = require("console");

class NOSFileSystemDriver {
  constructor(dbPath = "nos_filesystem.sqlite") {
    this.dbPath = dbPath;
    this.db = null;
    this.name = "bfsAccess";
    this.devClass = "NOS File System";
    this.version = 1.0;
    this.crt = null;
    this.fd = null; // BFS driver instance, diisi dari luar
    this.nativeMounts = [];
  }

  loadNativeMountsFromConfig(configPath = "/opt/conf/mountpoints.json") {
    let mounts = [
      // {
      //   virtual: "/serial",
      //   real: "/dev/ttyACM0",
      //   handler: {
      //     helloworld: () => {
      //       return "Hello from serial handler!";
      //     }
      //   }
      // }
    ];
    try {
      if (this.existsSync && this.readFileSync && this.existsSync(configPath)) {
        const raw = this.readFileSync(configPath, "utf8");
        const arr = JSON.parse(raw);
        for (const mnt of arr) {
          mounts.push({
            virtual: mnt.virtual,
            real: mnt.real,
            handler: require(mnt.handler)
          });
        }
      }
    } catch (e) {
      // ignore, fallback to empty
    }
    return mounts;
  }

  setCrt(crt) {
    this.crt = crt;
  }

  instanceCopy(source) {
    this.db = source.db;
  }
  // Membuat database baru (dan root) secara eksplisit
  async create(dbPath) {
    this.dbPath = dbPath;
    if (this.db) {
      this.close();
    }
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma("journal_mode = WAL");
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS files (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          parent_id INTEGER,
          name TEXT NOT NULL,
          is_directory BOOLEAN NOT NULL DEFAULT 0,
          content BLOB,
          checksum TEXT, -- Tambahan field checksum
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          owner_user TEXT DEFAULT 'root',
          owner_group TEXT DEFAULT 'root',
          filemod_owner TEXT DEFAULT 'rwx',
          filemod_group TEXT DEFAULT 'rwx',
          filemod_other TEXT DEFAULT 'rwx',
          UNIQUE (parent_id, name)
        );
      `);
      // Selalu buat root baru
      this.db
        .prepare(
          "INSERT INTO files (parent_id, name, is_directory, content, owner_user, owner_group, filemod_owner, filemod_group, filemod_other) VALUES (NULL, '', 1, NULL, 'root', 'root', 'rwx', 'rwx', 'rwx')",
        )
        .run();
      if (this.crt) this.crt.textOut("Root directory created (create DB).\n");
      if (this.crt)
        this.crt.textOut(`NOS File System created at ${this.dbPath}`);
    } catch (err) {
      console.error(`Error creating NOS File System: ${err.message}`);
      throw err;
    }
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
      const isNewDb = !fsx.existsSync(this.dbPath);
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

  // --- Helper Methods (Internal - Private) ---

  // Mendapatkan node (file/directory) berdasarkan path
  #getNodeByPath(filePath) {
    // PATCH: handle root path
    if (filePath === "/" || filePath === "") {
      return this.db
        .prepare(
          "SELECT id, name, checksum, is_directory, owner_user, owner_group, filemod_owner, filemod_group, filemod_other, updated_at, created_at, content FROM files WHERE parent_id IS NULL AND name = '' AND is_directory = 1",
        )
        .get();
    }
    // PATCH: handle mount point as virtual directory
    for (const mnt of this.nativeMounts) {
      // Normalisasi mount point
      let vMount = mnt.virtual.replace(/\/+$/, '');
      if (!vMount.startsWith('/')) vMount = '/' + vMount;
      // Persis mount point
      if (
        filePath === mnt.virtual.replace(/\/$/, "") ||
        filePath === mnt.virtual ||
        filePath === mnt.virtual.replace(/\/$/, "") + "/"
      ) {
        return {
          id: null,
          name: mnt.virtual.replace(/\//g, ""),
          is_directory: true,
          content: null,
          owner_user: "root",
          owner_group: "root",
          filemod_owner: "rwx",
          filemod_group: "rwx",
          filemod_other: "rwx",
        };
      }
      // PATCH: jika path di bawah mount point native, return dummy node agar cd/ls tidak error
      if (filePath.startsWith(vMount + '/')) {
        return {
          id: null,
          name: filePath.split('/').pop(),
          is_directory: true, // asumsikan direktori, biar cd/ls tidak error
          content: null,
          owner_user: "root",
          owner_group: "root",
          filemod_owner: "rwx",
          filemod_group: "rwx",
          filemod_other: "rwx",
        };
      }
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
          "SELECT id, name, checksum, is_directory, owner_user, owner_group, filemod_owner, filemod_group, filemod_other, updated_at, created_at, content FROM files WHERE parent_id = ? AND name = ?",
        )
        .get(currentParentId, parts[i]);
      if (!currentNode) return null;
      currentParentId = currentNode.id;
    }
    return currentNode;
  }

  // Mendapatkan parent ID dan nama dari path
  #getParentAndName(filePath) {
    const dirname = path.dirname(filePath);
    const basename = path.basename(filePath);

    if (dirname === "." || dirname === "/") {
      // Case for root or direct child of root
      const rootNode = this.#getNodeByPath("/"); // Menggunakan method private
      if (!rootNode) throw new Error("Root directory '/' not found.");
      return { parentNode: rootNode, name: basename };
    }

    const parentNode = this.#getNodeByPath(dirname); // Menggunakan method private
    if (!parentNode || !parentNode.is_directory) {
      throw new Error(
        `Parent directory '${dirname}' not found or is not a directory.`,
      );
    }
    return { parentNode, name: basename };
  }

  _resolveNativeMount(filePath) {
    // Normalisasi path: hilangkan double slash, trailing slash (kecuali root)
    let normPath = filePath.replace(/\/+/g, '/');
    if (normPath.length > 1 && normPath.endsWith('/')) normPath = normPath.replace(/\/+$/, '');

    for (const mnt of this.nativeMounts) {
      // Normalisasi mount point
      let vMount = mnt.virtual.replace(/\/+$/, '');
      if (!vMount.startsWith('/')) vMount = '/' + vMount;

      // Cek jika path persis mount point virtual (dengan/atau tanpa slash)
      if (normPath === vMount) {
        return {
          mount: mnt,
          realPath: mnt.real.replace(/\/+$/, ''),
          isMountRoot: true
        };
      }
      // Jika path di bawah mount point (misal /native/code atau /native/code/)
      if (normPath.startsWith(vMount + '/')) {
        const subPath = normPath.slice(vMount.length + 1); // +1 untuk slash
        return {
          mount: mnt,
          realPath: path.join(mnt.real, subPath),
          isMountRoot: false
        };
      }
    }
    return null;
  }

  // --- Implementasi Metode FS ---

  // Membaca isi file (async - tapi better-sqlite3 bersifat sinkron secara default, kita bungkus Promise)
  readFile(filePath, callback) {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.readFile(resolved.realPath, 'utf8', callback);
    }
    (async () => {
      try {
        const node = this.#getNodeByPath(filePath); // Menggunakan method private
        if (!node) {
          throw new Error(`File not found: ${filePath}`);
        }
        if (node.is_directory) {
          throw new Error(`${filePath} is a directory, not a file.`);
        }
        const data = node.content ? node.content.toString("utf8") : "";
        // Cek checksum
        const checksum = crypto.createHash('sha256').update(Buffer.from(data, 'utf8')).digest('hex');
        if (node.checksum && node.checksum !== checksum) {
          throw new Error(`Checksum mismatch for file: ${filePath}`);
        }
        callback(null, data);
      } catch (err) {
        callback(err, null);
      }
    })();
  }

  // Membaca isi file (sync)
  readFileSync(filePath, isASCII = false, encoding = "utf8") {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.readFileSync(resolved.realPath, encoding);
    }
    const node = this.#getNodeByPath(filePath); // Menggunakan method private
    if (!node) {
      throw new Error(`File not found: ${filePath}`);
    }
    if (node.is_directory) {
      throw new Error(`${filePath} is a directory, not a file.`);
    }
    const data = node.content ? node.content.toString(isASCII === true ? encoding : encoding) : "";
    // Cek checksum
    const checksum = crypto.createHash('sha256').update(Buffer.from(data, encoding)).digest('hex');
    if (node.checksum && node.checksum !== checksum) {
      throw new Error(`Checksum mismatch for file: ${filePath}`);
    }
    return data;
  }

  // Menulis data ke file (async)
  writeFile(filePath, data, callback) {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.writeFile(resolved.realPath, data, 'utf8', callback);
    }
    (async () => {
      try {
        const { parentNode, name } = this.#getParentAndName(filePath); // Menggunakan method private
        const existingNode = this.#getNodeByPath(filePath); // Menggunakan method private
        const contentBuffer = Buffer.from(data, "utf8"); // Simpan sebagai Buffer/BLOB
        // Hitung checksum SHA-256
        const checksum = crypto.createHash('sha256').update(contentBuffer).digest('hex');
        if (existingNode) {
          if (existingNode.is_directory) {
            throw new Error(`${filePath} is a directory, cannot write to it.`);
          }
          this.db
            .prepare(
              "UPDATE files SET content = ?, checksum = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            )
            .run(contentBuffer, checksum, existingNode.id);
        } else {
          this.db
            .prepare(
              "INSERT INTO files (parent_id, name, is_directory, content, checksum) VALUES (?, ?, 0, ?, ?)",
            )
            .run(parentNode.id, name, contentBuffer, checksum);
        }
        callback(null);
      } catch (err) {
        callback(err);
      }
    })();
  }

  // Menulis data ke file (sync)
  writeFileSync(filePath, data, encoding = "utf8") {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.writeFileSync(resolved.realPath, data, encoding);
    }
    const { parentNode, name } = this.#getParentAndName(filePath); // Menggunakan method private
    const existingNode = this.#getNodeByPath(filePath); // Menggunakan method private
    const contentBuffer = Buffer.from(data, encoding);
    // Hitung checksum SHA-256
    const checksum = crypto.createHash('sha256').update(contentBuffer).digest('hex');
    if (existingNode) {
      if (existingNode.is_directory) {
        throw new Error(`${filePath} is a directory, cannot write to it.`);
      }
      this.db
        .prepare(
          "UPDATE files SET content = ?, checksum = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .run(contentBuffer, checksum, existingNode.id);
    } else {
      this.db
        .prepare(
          "INSERT INTO files (parent_id, name, is_directory, content, checksum) VALUES (?, ?, 0, ?, ?)",
        )
        .run(parentNode.id, name, contentBuffer, checksum);
    }
  }

  // Menambah (append) data ke file (sync)
  appendFileSync(filePath, data, encoding = "utf8") {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.appendFileSync(resolved.realPath, data, encoding);
    }
    const { parentNode, name } = this.#getParentAndName(filePath);
    const existingNode = this.#getNodeByPath(filePath);
    const contentBuffer = Buffer.from(data, encoding);
    if (existingNode) {
      if (existingNode.is_directory) {
        throw new Error(`${filePath} is a directory, cannot append to it.`);
      }
      // Gabungkan konten lama + baru
      const oldContent = existingNode.content
        ? Buffer.from(existingNode.content)
        : Buffer.alloc(0);
      const newContent = Buffer.concat([oldContent, contentBuffer]);
      this.db
        .prepare(
          "UPDATE files SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        )
        .run(newContent, existingNode.id);
    } else {
      // Jika file belum ada, buat baru
      this.db
        .prepare(
          "INSERT INTO files (parent_id, name, is_directory, content) VALUES (?, ?, 0, ?)",
        )
        .run(parentNode.id, name, contentBuffer);
    }
  }

  // Mengecek apakah file/directory ada (async)
  fileExists(filePath, callback) {
    (async () => {
      try {
        const exists = !!this.#getNodeByPath(filePath); // Menggunakan method private
        callback(null, exists);
      } catch (err) {
        callback(err, false);
      }
    })();
  }

  // Mengecek apakah file/directory ada (sync)
  fileExistsSync(filePath) {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.existsSync(resolved.realPath);
    }
    try {
      return !!this.#getNodeByPath(filePath); // Menggunakan method private
    } catch (err) {
      return false;
    }
  }

  // Mengganti nama fungsi agar konsisten dengan fs.existsSync
  existsSync(filePath) {
    return this.fileExistsSync(filePath);
  }

  // Menghapus file/directory (async)
  deleteFile(filePath, callback) {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.unlink(resolved.realPath, callback);
    }
    (async () => {
      try {
        const node = this.#getNodeByPath(filePath); // Menggunakan method private
        if (!node) {
          throw new Error(`File or directory not found: ${filePath}`);
        }
        if (node.is_directory) {
          const childrenCount = this.db
            .prepare("SELECT COUNT(*) FROM files WHERE parent_id = ?")
            .get(node.id)["COUNT(*)"];
          if (childrenCount > 0) {
            throw new Error(`Directory ${filePath} is not empty.`);
          }
        }
        this.db.prepare("DELETE FROM files WHERE id = ?").run(node.id);
        if (callback) callback(null);
      } catch (err) {
        if (callback) callback(err);
      }
    })();
  }

  deleteFileSync(filePath) {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.unlinkSync(resolved.realPath);
    }
    this.deleteFile(filePath);
  }

  // Menghapus file/directory (sync)
  readdir(dirPath, callback) {
    const resolved = this._resolveNativeMount(dirPath);
    if (resolved) {
      return resolved.mount.handler.readdir(resolved.realPath, callback);
    }
    (async () => {
      try {
        const parentNode = this.#getNodeByPath(dirPath);
        if (!parentNode || !parentNode.is_directory) {
          throw new Error(
            `Directory not found or is not a directory: ${dirPath}`,
          );
        }
        const children = this.db
          .prepare("SELECT name FROM files WHERE parent_id = ?")
          .all(parentNode.id)
          .map((child) => child.name);
        callback(null, children);
      } catch (err) {
        callback(err, null);
      }
    })();
  }

  // Membaca isi direktori (sync)
  readdirSync(dirPath) {
    // PATCH: Normalisasi path
    let normPath = dirPath.replace(/\/+/g, '/');
    if (normPath.length > 1 && normPath.endsWith('/')) normPath = normPath.replace(/\/+$/, '');
    const resolved = this._resolveNativeMount(normPath);
    if (resolved) {
      if (resolved.isMountRoot) {
        // PATCH: return isi real path mount (array nama saja, tanpa hidden file)
        let list = resolved.mount.handler.readdirSync(resolved.mount.real);
        // Filter file/dir yang hidden (opsional, jika ingin tampilkan semua hapus baris ini)
        list = list.filter(name => !name.startsWith('.'));
        return list;
      } else {
        let list = resolved.mount.handler.readdirSync(resolved.realPath);
        list = list.filter(name => !name.startsWith('.'));
        return list;
      }
    }
    const parentNode = this.#getNodeByPath(normPath);
    if (!parentNode || !parentNode.is_directory) {
      throw new Error(`Directory not found or is not a directory: ${dirPath}`);
    }
    let children = this.db
      .prepare("SELECT name FROM files WHERE parent_id = ?")
      .all(parentNode.id)
      .map((child) => child.name);

    // Tambahkan mount point yang merupakan child dari direktori ini
    const normPathWithSlash = normPath.endsWith('/') ? normPath : normPath + '/';
    for (const mnt of this.nativeMounts) {
      // Ambil parent virtual mount
      const parentDir = path.posix.dirname(mnt.virtual);
      let mountName = path.posix.basename(mnt.virtual);
      if (parentDir === normPath || (normPath === '/' && parentDir === '')) {
        // Tambahkan hanya jika belum ada
        if (!children.includes(mountName)) {
          children.push(mountName);
        }
      }
    }
    return children;
  }

  // Membaca isi direktori (async)
  readdir(dirPath, callback) {
    // PATCH: Normalisasi path
    let normPath = dirPath.replace(/\/+/g, '/');
    if (normPath.length > 1 && normPath.endsWith('/')) normPath = normPath.replace(/\/+$/, '');
    const resolved = this._resolveNativeMount(normPath);
    if (resolved) {
      if (resolved.isMountRoot) {
        try {
          const list = resolved.mount.handler.readdirSync(resolved.mount.real);
          callback(null, list);
        } catch (err) {
          callback(err, null);
        }
        return;
      } else {
        return resolved.mount.handler.readdir(resolved.realPath, callback);
      }
    }
    (async () => {
      try {
        const parentNode = this.#getNodeByPath(normPath);
        if (!parentNode || !parentNode.is_directory) {
          throw new Error(
            `Directory not found or is not a directory: ${dirPath}`,
          );
        }
        const children = this.db
          .prepare("SELECT name FROM files WHERE parent_id = ?")
          .all(parentNode.id)
          .map((child) => child.name);
        callback(null, children);
      } catch (err) {
        callback(err, null);
      }
    })();
  }

  // Mendapatkan informasi file/direktori (sync)
  statSync(filePath) {
    // Normalisasi path: hilangkan double slash dan trailing slash kecuali root
    let normPath = filePath.replace(/\/+/g, '/');
    if (normPath.length > 1 && normPath.endsWith('/')) normPath = normPath.replace(/\/+$/, '');
    const resolved = this._resolveNativeMount(normPath);
    // PATCH: handle mount point as virtual directory
    if (!resolved) {
      for (const mnt of this.nativeMounts) {
        const v1 = mnt.virtual.replace(/\/$/, "");
        const v2 = mnt.virtual;
        if (
          normPath === v1 ||
          normPath === v2 ||
          normPath === v1 + "/" ||
          normPath === "/" + v1 ||
          normPath === "/" + v2 ||
          normPath === v2 + "/" ||
          normPath === v1.replace(/^\/+/, '') ||
          normPath === v2.replace(/^\/+/, '')
        ) {
          return {
            isFile: () => false,
            isDirectory: () => true,
            owner_user: "root",
            owner_group: "root",
            size: 0,
            mtime: new Date(),
            ctime: new Date(),
            atime: new Date(),
            mode: 0o777,
            checksum: null,
          };
        }
      }
    }
    if (resolved) {
      return resolved.mount.handler.statSync(resolved.realPath);
    }
    const node = this.#getNodeByPath(normPath);
    if (!node) {
      throw new Error(`File or directory not found: ${filePath}`);
    }
    // Simulasikan output fs.statSync
    return {
      isFile: () => !node.is_directory,
      isDirectory: () => !!node.is_directory,
      owner_user: node.owner_user,
      owner_group: node.owner_group,
      size: node.content ? node.content.length : 0,
      mtime: new Date(node.updated_at),
      ctime: new Date(node.created_at),
      atime: new Date(node.updated_at),
      mode: this.#calculateMode(node),
      checksum: node.checksum // <-- expose checksum
    };
  }

  // Helper untuk menghitung mode file (seperti rwx)
  #calculateMode(node) {
    const perms = {
      r: 4,
      w: 2,
      x: 1,
    };
    const parsePerms = (permString) =>
      permString.split("").reduce((acc, char) => acc + (perms[char] || 0), 0);

    const owner = parsePerms(node.filemod_owner || "");
    const group = parsePerms(node.filemod_group || "");
    const other = parsePerms(node.filemod_other || "");

    return (owner << 6) | (group << 3) | other;
  }

  // Membuat direktori (sync, support recursive)
  mkdirSync(dirPath, options = {}) {
    const resolved = this._resolveNativeMount(dirPath);
    if (resolved) {
      return resolved.mount.handler.mkdirSync(resolved.realPath, options);
    }
    const recursive = options.recursive || false;
    const parts = dirPath.split("/").filter(Boolean);
    let currentPath = "";
    for (let i = 0; i < parts.length; i++) {
      currentPath += "/" + parts[i];
      const node = this.#getNodeByPath(currentPath);
      if (!node) {
        if (!recursive && i !== parts.length - 1) {
          throw new Error(
            `Parent directory does not exist: ${path.dirname(currentPath)}`,
          );
        }
        const { parentNode, name } = this.#getParentAndName(currentPath);
        this.db
          .prepare(
            "INSERT INTO files (parent_id, name, is_directory, content) VALUES (?, ?, 1, NULL)",
          )
          .run(parentNode.id, name);
      } else if (!node.is_directory) {
        throw new Error(
          `Cannot create directory: ${currentPath} is an existing file.`,
        );
      }
    }
  }

  // Membuat direktori (async, support recursive)
  mkdir(dirPath, callback, options = {}) {
    (async () => {
      try {
        const recursive = options.recursive || false;
        const parts = dirPath.split("/").filter(Boolean);
        let currentPath = "";
        for (let i = 0; i < parts.length; i++) {
          currentPath += "/" + parts[i];
          const node = this.#getNodeByPath(currentPath);
          if (!node) {
            if (!recursive && i !== parts.length - 1) {
              throw new Error(
                `Parent directory does not exist: ${path.dirname(currentPath)}`,
              );
            }
            // Buat direktori baru
            const { parentNode, name } = this.#getParentAndName(currentPath);
            this.db
              .prepare(
                "INSERT INTO files (parent_id, name, is_directory, content) VALUES (?, ?, 1, NULL)",
              )
              .run(parentNode.id, name);
          } else if (!node.is_directory) {
            throw new Error(
              `Cannot create directory: ${currentPath} is an existing file.`,
            );
          }
        }
        callback(null);
      } catch (err) {
        callback(err);
      }
    })();
  }

  /**
   * chownSync: Change owner and group of a file or directory
   * @param {string} filePath
   * @param {string} user
   * @param {string} group
   */
  chownSync(filePath, user, group) {
    const stat = this.statSync(filePath);
    // Update owner_user dan owner_group di DB
    this.db.prepare("UPDATE files SET owner_user = ?, owner_group = ? WHERE name = ?").run(user, group, path.basename(filePath));
  }

  /**
   * chmodSync: Change file mode (permission) of a file or directory
   * @param {string} filePath
   * @param {string|number} mode (e.g. '755' or 0o755)
   */
  chmodSync(filePath, mode) {
    const stat = this.statSync(filePath);
    // Ambil permission string dari DB, bukan dari stat (stat tidak expose filemod_owner)
    const node = this.#getNodeByPath(filePath);
    let owner = node.filemod_owner || '---';
    let group = node.filemod_group || '---';
    let other = node.filemod_other || '---';
    if (/^[0-7]{3}$/.test(mode)) {
      const toRwx = (n) => ['r', 'w', 'x'].map((c, i) => (n & (4 >> i)) ? c : '-').join('');
      owner = toRwx(parseInt(mode[0]));
      group = toRwx(parseInt(mode[1]));
      other = toRwx(parseInt(mode[2]));
    } else {
      let changes = mode.split(",");
      for (let change of changes) {
        let m = change.match(/^([ugo]*)([+=-])([rwx]+)$/);
        if (!m) {
          m = change.match(/^([+-=])([rwx]+)$/);
          if (!m) throw new Error("chmod: invalid mode format");
          m = [null, "u", m[1], m[2]];
        }
        let who = m[1] || "u";
        let op = m[2];
        let perms = m[3];
        for (let w of who) {
          let target = (w === 'u' ? owner : w === 'g' ? group : other).split("");
          if (op === '+') {
            for (let c of perms) {
              const idx = { r: 0, w: 1, x: 2 }[c];
              if (idx !== undefined) target[idx] = c;
            }
          } else if (op === '-') {
            for (let c of perms) {
              const idx = { r: 0, w: 1, x: 2 }[c];
              if (idx !== undefined) target[idx] = '-';
            }
          } else if (op === '=') {
            // Reset hanya bit yang disebut, bit lain tetap
            for (let i = 0; i < 3; i++) {
              const c = ['r', 'w', 'x'][i];
              if (perms.includes(c)) {
                target[i] = c;
              } else {
                target[i] = '-';
              }
            }
          }
          if (w === 'u') owner = target.join("");
          else if (w === 'g') group = target.join("");
          else if (w === 'o') other = target.join("");
        }
      }
    }
    // Pastikan hasil hanya terdiri dari r/w/x/-
    owner = owner.replace(/[^rwx-]/g, '-').padEnd(3, '-').slice(0, 3);
    group = group.replace(/[^rwx-]/g, '-').padEnd(3, '-').slice(0, 3);
    other = other.replace(/[^rwx-]/g, '-').padEnd(3, '-').slice(0, 3);
    this.db.prepare("UPDATE files SET filemod_owner = ?, filemod_group = ?, filemod_other = ? WHERE id = ?").run(owner, group, other, node.id);
  }

  // Mengambil konten direktori (sesuai format getDirectoryContents Anda)
  getDirectoryContents(directoryPath) {
    const parentNode = this.#getNodeByPath(directoryPath); // Menggunakan method private
    if (!parentNode || !parentNode.is_directory) {
      throw new Error(
        `Directory not found or is not a directory: ${directoryPath}`,
      );
    }
    const children = this.db
      .prepare("SELECT name, is_directory FROM files WHERE parent_id = ?")
      .all(parentNode.id);
    let directories = [];
    let regularFiles = [];

    children.forEach((file) => {
      if (file.is_directory) directories.push(file.name + "/");
      else regularFiles.push(file.name);
    });
    // console.log(directories, regularFiles);
    return directories.concat(regularFiles);
  }

  // Menghapus file (sync)
  unlinkSync(filePath) {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.unlinkSync(resolved.realPath);
    }
    const node = this.#getNodeByPath(filePath);
    if (!node) {
      throw new Error(`File not found: ${filePath}`);
    }
    if (node.is_directory) {
      throw new Error(`${filePath} is a directory, cannot unlink.`);
    }
    this.db.prepare("DELETE FROM files WHERE id = ?").run(node.id);
  }

  // Menghapus file (async)
  unlink(filePath, callback) {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.unlink(resolved.realPath, callback);
    }
    (async () => {
      try {
        const node = this.#getNodeByPath(filePath);
        if (!node) {
          throw new Error(`File not found: ${filePath}`);
        }
        if (node.is_directory) {
          throw new Error(`${filePath} is a directory, cannot unlink.`);
        }
        this.db.prepare("DELETE FROM files WHERE id = ?").run(node.id);
        callback(null);
      } catch (err) {
        callback(err);
      }
    })();
  }

  // Menghapus direktori (sync)
  rmdirSync(dirPath) {
    const resolved = this._resolveNativeMount(dirPath);
    if (resolved) {
      return resolved.mount.handler.rmdirSync(resolved.realPath);
    }
    const node = this.#getNodeByPath(dirPath);
    if (!node) {
      throw new Error(`Directory not found: ${dirPath}`);
    }
    if (!node.is_directory) {
      throw new Error(`${dirPath} is not a directory.`);
    }
    const childrenCount = this.db
      .prepare("SELECT COUNT(*) FROM files WHERE parent_id = ?")
      .get(node.id)["COUNT(*)"];
    if (childrenCount > 0) {
      throw new Error(`Directory ${dirPath} is not empty.`);
    }
    this.db.prepare("DELETE FROM files WHERE id = ?").run(node.id);
  }

  // Menghapus direktori (async)
  rmdir(dirPath, callback) {
    const resolved = this._resolveNativeMount(dirPath);
    if (resolved) {
      return resolved.mount.handler.rmdir(resolved.realPath, callback);
    }
    (async () => {
      try {
        const node = this.#getNodeByPath(dirPath);
        if (!node) {
          throw new Error(`Directory not found: ${dirPath}`);
        }
        if (!node.is_directory) {
          throw new Error(`${dirPath} is not a directory.`);
        }
        const childrenCount = this.db
          .prepare("SELECT COUNT(*) FROM files WHERE parent_id = ?")
          .get(node.id)["COUNT(*)"];
        if (childrenCount > 0) {
          throw new Error(`Directory ${dirPath} is not empty.`);
        }
        this.db.prepare("DELETE FROM files WHERE id = ?").run(node.id);
        callback(null);
      } catch (err) {
        callback(err);
      }
    })();
  }
}

module.exports = { NOSFileSystemDriver };

/**
// Misal di bagian mana pun yang menginisialisasi driver file

const { NOSFileSystemDriver } = require('./path/to/nosfs.js'); // Sesuaikan path
const nosFsDriver = new NOSFileSystemDriver('nos_data.sqlite'); // Nama file DB Anda

// Pastikan untuk memanggil open() saat aplikasi NOS dimulai
(async () => {
    try {
        await nosFsDriver.open();
        if (this.crt) this.crt.textOut("NOS File System ready!");
        // Sekarang Anda bisa menggunakan nosFsDriver untuk operasi file
        // nosFsDriver.writeFileSync('/config/mynet.conf', 'data jaringan');
        // const content = nosFsDriver.readFileSync('/config/mynet.conf');
        // if (this.crt) this.crt.textOut(content);
    } catch (error) {
        console.error("Failed to initialize NOS File System:", error);
        // Tangani error, mungkin keluar dari aplikasi jika FS tidak bisa diinisialisasi
    }
})();

// Saat aplikasi NOS shutdown, panggil nosFsDriver.close();
process.on('exit', () => {
    nosFsDriver.close();
});

*/
