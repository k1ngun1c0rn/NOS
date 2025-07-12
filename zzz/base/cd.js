const path = require("path");
// const fs = require("fs");

module.exports = {
  version: "0.92",
  main: function (os) {
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);
    this.display = this.shell.crt;
    this.shell.basePath = "";

    const args = this.shell.parseCommand(this.shell.lastCmd);
    const targetPath = args.rawArgs[0] || "";
    let resolvedPath = "";

    this.updateAutoCompletionList = () => {
      const newContents = this.fd.getDirectoryContents(resolvedPath);
      // console.log("New auto-completion contents:", this.shell.term.autoCompletionList);
      this.shell.term.autoCompletionList = [
        ...new Set([...this.shell.term.autoCompletionList, ...newContents]),
      ];
    };

    if (targetPath === "/") {
      resolvedPath = "/";
    } else if (targetPath === "~") {
      resolvedPath = "/home/";
    } else {
      if (targetPath.startsWith("/")) {
        // Absolute path
        resolvedPath = path.normalize(targetPath);
      } else {
        // Relative path
        resolvedPath = path.normalize(this.shell.pwd + "/" + targetPath);
      }

      resolvedPath = resolvedPath.replace(/\\/g, "/").replace(/\/+/g, "/");
      if (!resolvedPath.startsWith("/")) resolvedPath = "/" + resolvedPath;
    }

    // Tambahkan trailing slash jika bukan root
    if (resolvedPath !== "/" && !resolvedPath.endsWith("/")) {
      resolvedPath += "/";
    }

    const fullPath = path
      .join(this.shell.basePath, resolvedPath)
      .replace(/\\/g, "/");

    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
      this.display.textOut(`${resolvedPath} not found!`);
    } else {
      this.shell.pwd = resolvedPath;
      this.updateAutoCompletionList();
    }

    this.shell.terminate();
  },
};
