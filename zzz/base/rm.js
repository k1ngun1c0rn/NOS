
module.exports = {
  name: "rm",
  version: 0.1,
  main: function (nos) {
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);

    const args = this.shell.parseCommand(this.shell.lastCmd);

    const path = nos.path; // Assuming nos.path is available and provides posix-like join

    const resolvePathHelper = (rawPath) => {
      const homeDirectory = this.shell.home || "/home";
      const currentWorkingDirectory = this.shell.pwd;

      if (rawPath === "~") rawPath = "~/";
      else if (rawPath === ".") rawPath = "./";

      if (rawPath.startsWith("~/")) {
        return path.posix.join(homeDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith("./")) {
        return path.posix.join(currentWorkingDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith("/")) {
        return rawPath; // Absolute path
      } else {
        // Relative to current working directory
        return path.posix.join(currentWorkingDirectory, rawPath);
      }
    };

    const showSyntax = () => {
      this.crt.textOut(`Syntax: ${args.command} <target>`);
      this.terminate();
    };

    if (!args.params._ || args.params._.length < 1) {
      showSyntax();
      return;
    }

    const target = resolvePathHelper(args.params._[0]);

    if (!args.params._[0]) {
      this.crt.textOut("Error: Target path tidak valid atau tidak diberikan.");
      this.terminate();
      return;
    }

    const deleteFile = (filePath) => {
      this.fd.unlinkSync(filePath);
      this.crt.textOut(`Deleted file: ${filePath}`);
    };

    const isRecursive = args.params.R || false;

    const deleteFolder = (folderPath) => {
      const items = this.fd.readdirSync(folderPath).map((name) => {
        const stats = this.fd.statSync(folderPath + "/" + name);
        return { name, isDirectory: stats.isDirectory(), isFile: stats.isFile() };
      });
      if (items.length === 0) {
        this.fd.rmdirSync(folderPath); // Use rmdirSync from this.fd
        this.crt.textOut(`Deleted empty folder: ${folderPath}`);
        return;
      }
      if (!isRecursive) {
        this.crt.textOut(`Error: Directory '${folderPath}' is not empty. Use -R to remove recursively.`);
        this.terminate();
        return;
      }
      for (const item of items) {
        const itemPath = folderPath + "/" + item.name;
        if (item.isDirectory) {
          deleteFolder(itemPath);
        } else if (item.isFile) {
          deleteFile(itemPath);
        }
      }
      this.fd.rmdirSync(folderPath);
      this.crt.textOut(`Deleted folder: ${folderPath}`);
    };

    if (this.fd.statSync(target).isDirectory()) {
      deleteFolder(target);
    } else {
      deleteFile(target);
    }

    this.crt.textOut("Delete operation completed.");
    this.terminate();
  },
};
