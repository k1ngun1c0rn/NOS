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
  readFileSync(filePath, encoding = 'utf8') {
    const node = this._getNodeByPath(filePath);
    if (!node) throw new Error(`File not found: ${filePath}`);
    if (node.is_directory) throw new Error(`${filePath} is a directory, not a file.`);
    if (encoding === null || encoding === undefined) return Buffer.from(node.content || '', 'utf8');
    return (node.content || '').toString(encoding);
  }

  writeFileSync(filePath, data, encoding = 'utf8') {
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
    return !!this._getNodeByPath(filePath);
  }

  existsSync(filePath) {
    return this.fileExistsSync(filePath);
  }

  unlinkSync(filePath) {
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
    const parentNode = this._getNodeByPath(dirPath);
    if (!parentNode || !parentNode.is_directory) throw new Error(`Directory not found or is not a directory: ${dirPath}`);
    const txn = this.env.beginTxn();
    const children = parentNode.children || [];
    const names = [];
    for (const childId of children) {
      const childStr = txn.getString(this.dbi, 'file:' + childId);
      const child = childStr ? JSON.parse(childStr) : null;
      if (child) names.push(child.name);
    }
    txn.abort();
    return names;
  }

  statSync(filePath) {
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

  getDirectoryContents(directoryPath) {
    const parentNode = this._getNodeByPath(directoryPath);
    if (!parentNode || !parentNode.is_directory) {
      throw new Error(
        `Directory not found or is not a directory: ${directoryPath}`
      );
    }
    const txn = this.env.beginTxn();
    const children = parentNode.children || [];
    let directories = [];
    let regularFiles = [];
    for (const childId of children) {
      const childStr = txn.getString(this.dbi, 'file:' + childId);
      const child = childStr ? JSON.parse(childStr) : null;
      if (child) {
        if (child.is_directory) {
          directories.push(child.name);
        } else {
          regularFiles.push(child.name);
        }
      }
    }
    txn.abort();
    return directories.concat(regularFiles);
  }

  _calculateMode(node) {
    const perms = { r: 4, w: 2, x: 1 };
    const parsePerms = (permString) => permString.split('').reduce((acc, char) => acc + (perms[char] || 0), 0);
    const owner = parsePerms(node.filemod_owner || '');
    const group = parsePerms(node.filemod_group || '');
    const other = parsePerms(node.filemod_other || '');
    return (owner << 6) | (group << 3) | other;
  }

  async readFile(filePath, encoding = 'utf8', callback) {
    try {
      const node = this._getNodeByPath(filePath);
      if (!node) throw new Error(`File not found: ${filePath}`);
      if (node.is_directory) throw new Error(`${filePath} is a directory, not a file.`);
      let data = node.content || '';
      if (encoding === null || encoding === undefined) {
        data = Buffer.from(data, 'utf8');
      } else {
        data = data.toString(encoding);
      }
      if (callback) callback(null, data);
      else return data;
    } catch (err) {
      if (callback) callback(err, null);
      else throw err;
    }
  }

  async writeFile(filePath, data, encoding = 'utf8', callback) {
    try {
      this.writeFileSync(filePath, data, encoding);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
      else throw err;
    }
  }

  async appendFile(filePath, data, encoding = 'utf8', callback) {
    try {
      this.appendFileSync(filePath, data, encoding);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
      else throw err;
    }
  }

  async unlink(filePath, callback) {
    try {
      this.unlinkSync(filePath);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
      else throw err;
    }
  }

  async readdir(dirPath, callback) {
    try {
      const names = this.readdirSync(dirPath);
      if (callback) callback(null, names);
      else return names;
    } catch (err) {
      if (callback) callback(err, null);
      else throw err;
    }
  }

  async stat(filePath, callback) {
    try {
      const stat = this.statSync(filePath);
      if (callback) callback(null, stat);
      else return stat;
    } catch (err) {
      if (callback) callback(err, null);
      else throw err;
    }
  }

  async mkdir(dirPath, options = {}, callback) {
    try {
      this.mkdirSync(dirPath, options);
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
      else throw err;
    }
  }

  async exists(filePath, callback) {
    try {
      const exists = this.existsSync(filePath);
      if (callback) callback(null, exists);
      else return exists;
    } catch (err) {
      if (callback) callback(err, false);
      else throw err;
    }
  }
}

module.exports = { NOSFileSystemDriver };
