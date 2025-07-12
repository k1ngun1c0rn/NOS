
module.exports = {
  name: "mkdir",
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
      this.crt.textOut(`Syntax: ${args.command} <directory>`);
      this.terminate();
    };

    if (!args.params._ || args.params._.length < 1) {
      showSyntax();
      return;
    }

    const dirPath = resolvePathHelper(args.params._[0]);

    if (this.fd.existsSync(dirPath)) {
      this.crt.textOut(`Error: Directory or file '${dirPath}' already exists.`);
      this.terminate();
      return;
    }

    this.fd.mkdirSync(dirPath, { recursive: true });
    this.crt.textOut(`Directory created: ${dirPath}`);
    this.terminate();
  },
};
