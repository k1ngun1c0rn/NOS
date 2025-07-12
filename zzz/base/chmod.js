const path = require("path");

module.exports = {
  name: "chmod",
  description: "Change file or directory permissions (rwx)",
  version: "1.1",
  needRoot: true,
  main: function (nos) {
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);
    this.crt = this.shell.crt;

    const parsed = this.shell.parseCommand(this.shell.lastCmd);
    let args = parsed.params._ || [];
    if (args.length === 1 && Object.keys(parsed.params).length > 1) {
      const modeKey = Object.keys(parsed.params).find(k => k !== '_');
      if (modeKey && (modeKey.startsWith('-') || modeKey.startsWith('+') || modeKey.startsWith('u') || modeKey.startsWith('g') || modeKey.startsWith('o'))) {
        args = [modeKey, ...args];
      }
    }
    if (args.length < 2) {
      this.crt.textOut("Usage: chmod <mode> <file>\n" +
        "Examples: chmod +x file.txt, chmod -w file.txt, chmod +rw file.txt, chmod 755 file.txt, chmod u+x file, chmod g-w file, chmod o=rw file, chmod u+x,g-w,o=r file\n" +
        "Symbolic: [ugo][+-=][rwx], e.g. u+x, g-w, o=rw, u+x,g-w,o=r\n" +
        "Octal: 755, 644, etc.");
      this.shell.terminate();
      return;
    }
    // --- PATCH: Support -R (recursive) and wildcard expansion ---
    let recursive = false;
    // Cek dan buang -R dari args jika ada
    args = args.filter(arg => {
      if (arg === '-R' || arg === '--recursive') {
        recursive = true;
        return false;
      }
      return true;
    });
    let [mode, filePath] = args;
    const path = this.shell.pathLib;

    // Helper: ekspansi wildcard (hanya *, ?)
    function expandWildcards(basePath) {
      if (!basePath.includes('*') && !basePath.includes('?')) return [basePath];
      const dir = path.posix.dirname(basePath);
      const mask = path.posix.basename(basePath);
      let list = [];
      try {
        list = this.fd.readdirSync(dir);
      } catch (e) {
        this.crt.textOut(`chmod: cannot access '${dir}': ${e.message}`);
        return [];
      }
      const regex = new RegExp('^' + mask.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
      return list.filter(f => regex.test(f)).map(f => path.posix.join(dir, f));
    }

    // Helper: chmod recursive
    function chmodRecursive(targetPath, mode) {
      let stat;
      try {
        stat = this.fd.statSync(targetPath);
      } catch (e) {
        this.crt.textOut(`chmod: cannot access '${targetPath}': ${e.message}`);
        return;
      }
      this.fd.chmodSync(targetPath, mode);
      if (stat.isDirectory()) {
        let files;
        try {
          files = this.fd.readdirSync(targetPath);
        } catch (e) {
          this.crt.textOut(`chmod: cannot read dir '${targetPath}': ${e.message}`);
          return;
        }
        for (const f of files) {
          const childPath = path.posix.join(targetPath, f);
          chmodRecursive.call(this, childPath, mode);
        }
      }
    }
    const resolvePathHelper = (rawPath) => {
      const homeDirectory = this.shell.home || '/home';
      const currentWorkingDirectory = this.shell.pwd;

      if (rawPath === '~') rawPath = '~/'
      else if (rawPath === '.') rawPath = './'

      if (rawPath.startsWith('~/')) {
        return path.posix.join(homeDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith('./')) {
        return path.posix.join(currentWorkingDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith('/')) {
        return rawPath; // Absolute path
      } else {
        // Relative to current working directory
        return path.posix.join(currentWorkingDirectory, rawPath);
      }
    };

    filePath = resolvePathHelper(filePath);
    // Ekspansi wildcard
    let targets = expandWildcards.call(this, filePath);
    if (targets.length === 0) {
      this.crt.textOut(`chmod: no match for '${filePath}'`);
      this.shell.terminate();
      return;
    }
    try {
      for (const target of targets) {
        if (recursive) {
          chmodRecursive.call(this, target, mode);
          this.crt.textOut(`Permissions of '${target}' and subfiles changed${mode}`);
        } else {
          this.fd.chmodSync(target, mode);
          this.crt.textOut(`Permissions of '${target}' changed to ${mode}`);
        }
      }
    } catch (err) {
      this.crt.textOut(`chmod: ${err.message}`);
    }
    this.shell.terminate();
  },
};
