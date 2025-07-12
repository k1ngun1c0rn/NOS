module.exports = {
  name: "cp",
  version: 0.1,
  main: function (nos) {
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);

    const args = this.shell.parseCommand(this.shell.lastCmd);

    const path = nos.path; // Assuming nos.path is available and provides posix-like join

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

    const showSyntax = () => {
      this.crt.textOut(`Syntax: ${args.command} <source> <destination>`);
      this.terminate();
    };

    if (!args.params._ || args.params._.length < 2) {
      showSyntax();
      return;
    }

    const sourcePath = resolvePathHelper(args.params._[0]);
    const rawDestPathString = args.params._[1];
    let resolvedDestPath = resolvePathHelper(rawDestPathString);
    let finalDestinationPath;

    if (!this.fd.existsSync(sourcePath)) {
      this.crt.textOut(`Error: Source '${sourcePath}' does not exist.`);
      this.terminate();
      return;
    }

    const sourceIsDirectory = this.fd.statSync(sourcePath).isDirectory();

    // Tentukan path destinasi final
    if (this.fd.existsSync(resolvedDestPath) && this.fd.statSync(resolvedDestPath).isDirectory()) {
      // Kasus 1: Destinasi ada dan merupakan direktori. Item akan ditempatkan di dalamnya.
      finalDestinationPath = path.posix.join(resolvedDestPath, path.posix.basename(sourcePath));
    } else if (rawDestPathString.endsWith('/') || rawDestPathString === '~' || rawDestPathString === '.') {
      // Kasus 2: String destinasi secara eksplisit menunjukkan target direktori (misalnya, "mydir/", "~/", "./")
      // Item akan ditempatkan di dalam direktori ini (yang mungkin perlu dibuat).
      finalDestinationPath = path.posix.join(resolvedDestPath, path.posix.basename(sourcePath));
    } else {
      // Kasus 3: Destinasi adalah nama file spesifik atau nama direktori baru (jika sumber adalah direktori).
      finalDestinationPath = resolvedDestPath;
    }

    // Untuk penyalinan file, pastikan direktori induk dari destinasi final ada
    if (!sourceIsDirectory) {
      const parentDir = path.posix.dirname(finalDestinationPath);
      if (!this.fd.existsSync(parentDir)) {
        try {
          this.fd.mkdirSync(parentDir, { recursive: true });
        } catch (e) {
          this.crt.textOut(`Error creating directory ${parentDir}: ${e.message}`);
          this.terminate();
          return;
        }
      }
    }

    // Cek penyalinan direktori ke dalam dirinya sendiri atau subdirektorinya
    if (sourceIsDirectory) {
      if (finalDestinationPath.startsWith(sourcePath + '/') || finalDestinationPath === sourcePath) {
        this.crt.textOut(`Error: Cannot copy a directory into itself or a subdirectory.`);
        this.terminate();
        return;
      }
    }

    const copyFile = (src, dest) => {
      const data = this.fd.readFileSync(src);
      this.fd.writeFileSync(dest, data);
      this.crt.textOut(`Copied: ${src} to ${dest}`);
    };

    const copyFolder = (srcDir, destDir) => {
      if (!this.fd.existsSync(destDir)) {
        this.fd.mkdirSync(destDir, { recursive: true });
      }
      const items = this.fd.readdirSync(srcDir, { withFileTypes: true });
      for (const item of items) {
        const srcPath = srcDir + '/' + item.name;
        const destPath = destDir + '/' + item.name;
        if (item.isDirectory()) {
          copyFolder(srcPath, destPath);
        } else if (item.isFile()) {
          copyFile(srcPath, destPath);
        }
      }
    };

    if (sourceIsDirectory) {
      copyFolder(sourcePath, finalDestinationPath);
    } else {
      copyFile(sourcePath, finalDestinationPath);
    }

    this.crt.textOut("Copy operation completed.");
    this.terminate();
  },
};
