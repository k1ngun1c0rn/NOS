const path = require("path");

module.exports = {
  name: "chown",
  description: "Change owner and group of a file or directory",
  version: "1.0",
  needRoot: true,
  main: function (nos) {
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);
    this.crt = this.shell.crt;

    const parsed = this.shell.parseCommand(this.shell.lastCmd);
    const args = parsed.params._ || [];
    if (args.length < 2) {
      this.crt.textOut("Usage: chown <user:group> <file>");
      this.shell.terminate();
      return;
    }
    let [userGroup, filePath] = args;
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
    const [user, group] = userGroup.split(":");
    try {
      this.fd.chownSync(filePath, user, group);
      this.crt.textOut(`Owner of '${filePath}' changed to ${user}:${group}`);
    } catch (err) {
      this.crt.textOut(`chown: ${err.message}`);
    }
    this.shell.terminate();
  },
};
