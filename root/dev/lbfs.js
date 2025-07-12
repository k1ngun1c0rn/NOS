const lmdb = require('node-lmdb');
const path = require('path');
const os = require('os');
const fsx = require('fs');
const crypto = require('crypto');
const requireFromString = require('require-from-string');

class NOSFileSystemDriver {
  constructor(dbPath = 'nos_filesystem.lmdb') {
    this.dbPath = dbPath;
    this.env = null;
    this.dbi = null;
    this.name = 'bfsAccess';
    this.devClass = 'NOS File System (LMDB)';
    this.version = 1.0;
    this.crt = null;
    this.cache = {}; // Cache manual untuk modul BFS
    this.nativeMounts = [];
  }

  setCrt(crt) {
    this.crt = crt;
  }

  instanceCopy(source) {
    this.env = source.env;
    this.dbi = source.dbi;
  }

  createSync(dbPath) {
    this.dbPath = dbPath;
    if (this.env) this.close();
    this.env = new lmdb.Env();
    this.env.open({
      path: this.dbPath,
      maxDbs: 1,
      mapSize: 1024 * 1024 * 1024 // 1GB default
    });
    this.dbi = this.env.openDbi({ name: null, create: true });
    // Buat root directory jika belum ada
    const txn = this.env.beginTxn();
    let root = txn.getString(this.dbi, 'meta:root');
    if (!root) {
      txn.putString(this.dbi, 'meta:root', JSON.stringify({ id: 'root', name: '', is_directory: true, parent: null, children: [], created_at: Date.now(), updated_at: Date.now(), owner_user: 'root', owner_group: 'root', filemod_owner: 'rwx', filemod_group: 'rwx', filemod_other: 'rwx' }));
    }
    txn.commit();
    if (this.crt) this.crt.textOut('Root directory created (create LMDB).\n');
    if (this.crt) this.crt.textOut(`NOS File System (LMDB) created at ${this.dbPath}`);
  }

  openSync(dbPath) {
    if (dbPath) this.dbPath = dbPath;
    if (this.env) {
      if (this.crt) this.crt.textOut('Database connection already open.');
      return;
    }
    this.env = new lmdb.Env();
    this.env.open({
      path: this.dbPath,
      maxDbs: 1,
      mapSize: 1024 * 1024 * 1024
    });
    this.dbi = this.env.openDbi({ name: null, create: true });
    // Pastikan root ada
    const txn = this.env.beginTxn();
    let root = txn.getString(this.dbi, 'meta:root');
    if (!root) {
      txn.putString(this.dbi, 'meta:root', JSON.stringify({ id: 'root', name: '', is_directory: true, parent: null, children: [], created_at: Date.now(), updated_at: Date.now(), owner_user: 'root', owner_group: 'root', filemod_owner: 'rwx', filemod_group: 'rwx', filemod_other: 'rwx' }));
      if (this.crt) this.crt.textOut('Root directory created.');
    }
    txn.commit();
    if (this.crt) this.crt.textOut(`NOS File System (LMDB) connected to ${this.dbPath}`);
  }

  close() {
    if (this.dbi) {
      this.dbi.close();
      this.dbi = null;
    }
    if (this.env) {
      this.env.close();
      this.env = null;
      if (this.crt) this.crt.textOut('NOS File System (LMDB) connection closed.');
    }
  }

  // Metode untuk memuat modul dari BFS
  require(bfsPath, options = {}) {
    if (!bfsPath.endsWith(".js")) bfsPath += ".js";
    if (this.cache[bfsPath] && !options.noCache) {
      return this.cache[bfsPath];
    }
    const code = this.readFileSync(bfsPath, "utf8");
    let result;
    try {
      result = requireFromString(code);
      this.cache[bfsPath] = result;
    } catch (error) {
      console.error(`Error requiring module from BFS: ${error.message}`);
      throw error;
    }
    return result;
  }

  clearCache(bfsPath) {
    if (!bfsPath.endsWith(".js")) bfsPath += ".js";
    if (this.cache[bfsPath]) {
      delete this.cache[bfsPath];
    }
  }

  clearCacheRecursive(bfsPath) {
    if (!bfsPath.endsWith(".js")) bfsPath += ".js";
    if (this.cache[bfsPath]) {
      delete this.cache[bfsPath];
    }
    const module = require.cache[require.resolve(bfsPath)];
    if (module && module.children) {
      module.children.forEach((child) => {
        this.clearCacheRecursive(child.id);
      });
    }
    delete require.cache[require.resolve(bfsPath)];
  }

  clearAllCache() {
    this.cache = {};
    console.log("All BFS module cache cleared.");
  }

  // --- Helper Methods ---
  _getNodeByPath(filePath) {
    const txn = this.env.beginTxn();
    let node;
    if (filePath === '/' || filePath === '') {
      node = txn.getString(this.dbi, 'meta:root');
      txn.abort();
      return node ? JSON.parse(node) : null;
    }
    const parts = filePath.split('/').filter(Boolean);
    node = txn.getString(this.dbi, 'meta:root');
    node = node ? JSON.parse(node) : null;
    for (const part of parts) {
      if (!node || !node.is_directory) { txn.abort(); return null; }
      const children = node.children || [];
      let found = null;
      for (const childId of children) {
        const childStr = txn.getString(this.dbi, 'file:' + childId);
        const child = childStr ? JSON.parse(childStr) : null;
        if (child && child.name === part) {
          found = child;
          break;
        }
      }
      if (!found) { txn.abort(); return null; }
      node = found;
    }
    txn.abort();
    return node;
  }

  _getParentAndName(filePath) {
    const dirname = path.dirname(filePath);
    const basename = path.basename(filePath);
    let parentNode;
    if (dirname === '.' || dirname === '/') {
      parentNode = this._getNodeByPath('/');
      if (!parentNode) throw new Error("Root directory '/' not found.");
    } else {
      parentNode = this._getNodeByPath(dirname);
      if (!parentNode || !parentNode.is_directory) throw new Error(`Parent directory '${dirname}' not found or is not a directory.`);
    }
    return { parentNode, name: basename };
  }

  // --- Implementasi Metode FS Synchronous ---
  readFileSync(filePath, isASCII = false, encoding = 'utf8') {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.readFileSync(resolved.realPath, encoding);
    }
    const node = this._getNodeByPath(filePath);
    if (!node) throw new Error(`File not found: ${filePath}`);
    if (node.is_directory) throw new Error(`${filePath} is a directory, not a file.`);
    if (isASCII === true) {
      return (node.content || '').toString(encoding);
    } else {
      // Tetap kembalikan string jika encoding diberikan, buffer jika null
      if (encoding === null || encoding === undefined) return Buffer.from(node.content || '', 'utf8');
      return (node.content || '').toString(encoding);
    }
  }

  writeFileSync(filePath, data, encoding = 'utf8') {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.writeFileSync(resolved.realPath, data, encoding);
    }
    const { parentNode, name } = this._getParentAndName(filePath);
    const children = parentNode.children || [];
    let existingNode = null;
    const txn = this.env.beginTxn();
    for (const childId of children) {
      const childStr = txn.getString(this.dbi, 'file:' + childId);
      const child = childStr ? JSON.parse(childStr) : null;
      if (child && child.name === name) {
        existingNode = child;
        break;
      }
    }
    const content = (typeof data === 'string') ? data : Buffer.isBuffer(data) ? data.toString(encoding) : String(data);
    const checksum = crypto.createHash('sha256').update(Buffer.from(content, 'utf8')).digest('hex');
    let nodeId;
    if (existingNode) {
      if (existingNode.is_directory) { txn.abort(); throw new Error(`${filePath} is a directory, cannot write to it.`); }
      nodeId = existingNode.id;
      txn.putString(this.dbi, 'file:' + nodeId, JSON.stringify({ ...existingNode, content, checksum, updated_at: Date.now() }));
    } else {
      nodeId = crypto.randomBytes(8).toString('hex');
      txn.putString(this.dbi, 'file:' + nodeId, JSON.stringify({ id: nodeId, name, is_directory: false, parent: parentNode.id, content, checksum, created_at: Date.now(), updated_at: Date.now(), owner_user: 'root', owner_group: 'root', filemod_owner: 'rwx', filemod_group: 'rwx', filemod_other: 'rwx' }));
      parentNode.children.push(nodeId);
      txn.putString(this.dbi, parentNode.id === 'root' ? 'meta:root' : 'file:' + parentNode.id, JSON.stringify(parentNode));
    }
    txn.commit();
  }

  appendFileSync(filePath, data, encoding = 'utf8') {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.appendFileSync(resolved.realPath, data, encoding);
    }
    let contentToAppend = (typeof data === 'string') ? data : Buffer.isBuffer(data) ? data.toString(encoding) : String(data);
    let existingContent = '';
    let exists = this.fileExistsSync(filePath);
    if (exists) {
      const node = this._getNodeByPath(filePath);
      if (node.is_directory) throw new Error(`${filePath} is a directory, cannot append to it.`);
      existingContent = node.content || '';
    }
    const newContent = existingContent + contentToAppend;
    this.writeFileSync(filePath, newContent, encoding);
  }

  fileExistsSync(filePath) {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.existsSync(resolved.realPath);
    }
    return !!this._getNodeByPath(filePath);
  }

  existsSync(filePath) {
    return this.fileExistsSync(filePath);
  }

  unlinkSync(filePath) {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.unlinkSync(resolved.realPath);
    }
    const node = this._getNodeByPath(filePath);
    if (!node) throw new Error(`File or directory not found: ${filePath}`);
    if (node.is_directory && node.children && node.children.length > 0) throw new Error(`Directory ${filePath} is not empty.`);
    const txn = this.env.beginTxn();
    txn.del(this.dbi, 'file:' + node.id);
    // Hapus dari parent
    const parentNodeStr = txn.getString(this.dbi, 'file:' + node.parent) || txn.getString(this.dbi, 'meta:root');
    const parentNode = parentNodeStr ? JSON.parse(parentNodeStr) : null;
    if (parentNode && parentNode.children) {
      parentNode.children = parentNode.children.filter(cid => cid !== node.id);
      txn.putString(this.dbi, parentNode.id === 'root' ? 'meta:root' : 'file:' + parentNode.id, JSON.stringify(parentNode));
    }
    txn.commit();
  }

  readdirSync(dirPath) {
    const resolved = this._resolveNativeMount(dirPath);
    if (resolved) {
      if (resolved.isMountRoot) {
        let list = resolved.mount.handler.readdirSync(resolved.mount.real);
        return list;
      } else {
        let list = resolved.mount.handler.readdirSync(resolved.realPath);
        return list;
      }
    }
    // --- Tambahkan mount point virtual yang berada di bawah dirPath ---
    const parentNode = this._getNodeByPath(dirPath);
    if (!parentNode || !parentNode.is_directory) throw new Error(`Directory not found or is not a directory: ${dirPath}`);
    const txn = this.env.beginTxn();
    const children = parentNode.children || [];
    const names = [];
    const childNames = new Set();
    for (const childId of children) {
      const childStr = txn.getString(this.dbi, 'file:' + childId);
      const child = childStr ? JSON.parse(childStr) : null;
      if (child) {
        names.push(child.name);
        childNames.add(child.name);
      }
    }
    // Cek mount point yang parent-nya dirPath
    const normDir = dirPath.replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
    for (const mnt of this.nativeMounts) {
      let vMount = mnt.virtual.replace(/\/+/g, '/').replace(/\/+$/, '');
      if (!vMount.startsWith('/')) vMount = '/' + vMount;
      const parentMount = path.dirname(vMount) || '/';
      const baseMount = path.basename(vMount);
      if (parentMount === normDir && !childNames.has(baseMount)) {
        names.push(baseMount);
        childNames.add(baseMount);
      }
    }
    txn.abort();
    return names;
  }

  statSync(filePath) {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      return resolved.mount.handler.statSync(resolved.realPath);
    }
    const node = this._getNodeByPath(filePath);
    if (!node) throw new Error(`File or directory not found: ${filePath}`);
    return {
      isFile: () => !node.is_directory,
      isDirectory: () => !!node.is_directory,
      owner_user: node.owner_user,
      owner_group: node.owner_group,
      size: node.content ? Buffer.byteLength(node.content, 'utf8') : 0,
      mtime: new Date(node.updated_at),
      ctime: new Date(node.created_at),
      atime: new Date(node.updated_at),
      mode: this._calculateMode(node),
      checksum: node.checksum
    };
  }

  mkdirSync(dirPath, options = {}) {
    const resolved = this._resolveNativeMount(dirPath);
    if (resolved) {
      return resolved.mount.handler.mkdirSync(resolved.realPath, options);
    }
    const recursive = options.recursive || false;
    const parts = dirPath.split('/').filter(Boolean);
    let currentPath = '';
    let parentNode = this._getNodeByPath('/');
    for (let i = 0; i < parts.length; i++) {
      currentPath += '/' + parts[i];
      let node = this._getNodeByPath(currentPath);
      if (!node) {
        if (!recursive && i !== parts.length - 1) throw new Error(`Parent directory does not exist: ${path.dirname(currentPath)}`);
        const nodeId = crypto.randomBytes(8).toString('hex');
        node = { id: nodeId, name: parts[i], is_directory: true, parent: parentNode.id, children: [], created_at: Date.now(), updated_at: Date.now(), owner_user: 'root', owner_group: 'root', filemod_owner: 'rwx', filemod_group: 'rwx', filemod_other: 'rwx' };
        const txn = this.env.beginTxn();
        txn.putString(this.dbi, 'file:' + nodeId, JSON.stringify(node));
        parentNode.children.push(nodeId);
        txn.putString(this.dbi, parentNode.id === 'root' ? 'meta:root' : 'file:' + parentNode.id, JSON.stringify(parentNode));
        txn.commit();
      } else if (!node.is_directory) {
        throw new Error(`Cannot create directory: ${currentPath} is an existing file.`);
      }
      parentNode = node;
    }
  }

  loadNativeMountsFromConfig(configPath = "/opt/conf/mountpoints.json") {
    let mounts = [];
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
    this.nativeMounts = mounts;
    return mounts;
  }

  _resolveNativeMount(filePath) {
    let normPath = filePath.replace(/\/+/g, '/');
    if (normPath.length > 1 && normPath.endsWith('/')) normPath = normPath.replace(/\/+$/, '');
    for (const mnt of this.nativeMounts) {
      let vMount = mnt.virtual.replace(/\/+$/, '');
      if (!vMount.startsWith('/')) vMount = '/' + vMount;
      if (normPath === vMount) {
        return {
          mount: mnt,
          realPath: mnt.real.replace(/\/+$/, ''),
          isMountRoot: true
        };
      }
      if (normPath.startsWith(vMount + '/')) {
        const subPath = normPath.slice(vMount.length + 1);
        return {
          mount: mnt,
          realPath: require('path').join(mnt.real, subPath),
          isMountRoot: false
        };
      }
    }
    return null;
  }

  /**
   * getDirectoryContents: Returns directories first, then files, like bfs.js
   * @param {string} dirPath
   * @returns {string[]} Array of names (dirs first, then files)
   */
  getDirectoryContents(dirPath) {
    const resolved = this._resolveNativeMount(dirPath);
    if (resolved) {
      // Native mount: try to get directories and files separately if possible
      const list = resolved.mount.handler.readdirSync(resolved.realPath);
      const dirs = [], files = [];
      for (const name of list) {
        try {
          const stat = resolved.mount.handler.statSync(path.join(resolved.realPath, name));
          if (stat.isDirectory && stat.isDirectory()) dirs.push(name);
          else files.push(name);
        } catch (e) { files.push(name); }
      }
      return dirs.concat(files);
    }
    // --- Tambahkan mount point virtual yang berada di bawah dirPath ---
    const parentNode = this._getNodeByPath(dirPath);
    if (!parentNode || !parentNode.is_directory) throw new Error(`Directory not found or is not a directory: ${dirPath}`);
    const txn = this.env.beginTxn();
    const children = parentNode.children || [];
    const dirs = [], files = [];
    const childNames = new Set();
    for (const childId of children) {
      const childStr = txn.getString(this.dbi, 'file:' + childId);
      const child = childStr ? JSON.parse(childStr) : null;
      if (child) {
        childNames.add(child.name);
        if (child.is_directory) dirs.push(child.name);
        else files.push(child.name);
      }
    }
    // Cek mount point yang parent-nya dirPath
    const normDir = dirPath.replace(/\/+/g, '/').replace(/\/+$/, '') || '/';
    for (const mnt of this.nativeMounts) {
      let vMount = mnt.virtual.replace(/\/+/g, '/').replace(/\/+$/, '');
      if (!vMount.startsWith('/')) vMount = '/' + vMount;
      const parentMount = path.dirname(vMount) || '/';
      const baseMount = path.basename(vMount);
      if (parentMount === normDir && !childNames.has(baseMount)) {
        dirs.push(baseMount);
        childNames.add(baseMount);
      }
    }
    txn.abort();
    return dirs.concat(files);
  }

  /**
   * readFile: async/callback/Promise, bfs.js compatible, nativeMount aware
   * @param {string} filePath
   * @param {string|function} [encoding]
   * @param {function} [callback]
   * @returns {Promise|void}
   */
  readFile(filePath, encoding, callback) {
    // Signature normalization
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = 'utf8';
    }
    if (encoding === undefined || encoding === null) encoding = 'utf8';
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      if (callback) return resolved.mount.handler.readFile(resolved.realPath, encoding, callback);
      return new Promise((resolve, reject) => {
        resolved.mount.handler.readFile(resolved.realPath, encoding, (err, data) => {
          if (err) reject(err); else resolve(data);
        });
      });
    }
    // LMDB backend
    const doRead = () => {
      try {
        const node = this._getNodeByPath(filePath);
        if (!node) throw new Error(`File not found: ${filePath}`);
        if (node.is_directory) throw new Error(`${filePath} is a directory, not a file.`);
        let data = node.content || '';
        if (encoding === null) data = Buffer.from(data, 'utf8');
        else data = data.toString(encoding);
        return data;
      } catch (err) {
        throw err;
      }
    };
    if (callback) {
      try {
        const data = doRead();
        callback(null, data);
      } catch (err) {
        callback(err, null);
      }
      return;
    }
    return new Promise((resolve, reject) => {
      try {
        const data = doRead();
        resolve(data);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * chownSync: Change owner and group of a file or directory
   * @param {string} filePath
   * @param {string} user
   * @param {string} group
   */
  chownSync(filePath, user, group) {
    const resolved = this._resolveNativeMount(filePath);
    if (resolved) {
      if (typeof resolved.mount.handler.chownSync === 'function') {
        return resolved.mount.handler.chownSync(resolved.realPath, user, group);
      } else {
        throw new Error('Native mount does not support chownSync');
      }
    }
    const node = this._getNodeByPath(filePath);
    if (!node) throw new Error(`File not found: ${filePath}`);
    const txn = this.env.beginTxn();
    const key = node.id === 'root' ? 'meta:root' : 'file:' + node.id;
    const updated = { ...node, owner_user: user, owner_group: group, updated_at: Date.now() };
    txn.putString(this.dbi, key, JSON.stringify(updated));
    txn.commit();
  }

  /**
   * chmodSync: Change file mode (permission) of a file or directory
   * @param {string} filePath
   * @param {string|number} mode (e.g. '755' or 0o755)
   */
  chmodSync(filePath, mode) {
    // const resolved = this._resolveNativeMount(filePath);
    // if (resolved) {
    //   if (typeof resolved.mount.handler.chmodSync === 'function') {
    //     return resolved.mount.handler.chmodSync(resolved.realPath, mode);
    //   } else {
    //     throw new Error('Native mount does not support chmodSync');
    //   }
    // }
    const node = this._getNodeByPath(filePath);
    if (!node) throw new Error(`File not found: ${filePath}`);
    let owner = node.filemod_owner || '---';
    let group = node.filemod_group || '---';
    let other = node.filemod_other || '---';
    if (/^[0-7]{3}$/.test(mode)) {
      // Octal mode
      const toRwx = (n) => ['r', 'w', 'x'].map((c, i) => (n & (4 >> i)) ? c : '-').join('');
      owner = toRwx(parseInt(mode[0]));
      group = toRwx(parseInt(mode[1]));
      other = toRwx(parseInt(mode[2]));
    } else {
      // Symbolic mode: [ugo][+-=][rwx](,[ugo][+-=][rwx])*
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
            // Set only the specified bits, clear others
            target = ['-', '-', '-'];
            for (let c of perms) {
              const idx = { r: 0, w: 1, x: 2 }[c];
              if (idx !== undefined) target[idx] = c;
            }
          }
          // Gabungkan hasil ke variabel utama
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
    const txn = this.env.beginTxn();
    const key = node.id === 'root' ? 'meta:root' : 'file:' + node.id;
    const updated = { ...node, filemod_owner: owner, filemod_group: group, filemod_other: other, updated_at: Date.now() };
    txn.putString(this.dbi, key, JSON.stringify(updated));
    txn.commit();
  }

  /**
   * _calculateMode: Returns a numeric mode (UNIX style) from node permission fields
   * @param {object} node
   * @returns {number}
   */
  _calculateMode(node) {
    // Default: 0o777 for directories, 0o666 for files, or use filemod_* fields if present
    let mode = 0;
    const rwxToBits = (rwx) => {
      let m = 0;
      if (!rwx) return 0;
      if (rwx.includes('r')) m |= 4;
      if (rwx.includes('w')) m |= 2;
      if (rwx.includes('x')) m |= 1;
      return m;
    };
    const owner = rwxToBits(node.filemod_owner || (node.is_directory ? 'rwx' : 'rw-'));
    const group = rwxToBits(node.filemod_group || (node.is_directory ? 'rwx' : 'rw-'));
    const other = rwxToBits(node.filemod_other || (node.is_directory ? 'rwx' : 'rw-'));
    mode = (owner << 6) | (group << 3) | other;
    // Add directory bit
    if (node.is_directory) mode |= 0o40000; // S_IFDIR
    else mode |= 0o100000; // S_IFREG
    return mode;
  }
}

module.exports = { NOSFileSystemDriver };
