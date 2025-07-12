module.exports = {
  name: "umount",
  version: 0.1,
  main: function (nos) {
    this.shell.loadDevices([{ name: "bfsAccess", objectName: "fd" }], this);

    const argsObj = this.shell.parseCommand(this.shell.lastCmd);
    const args = argsObj.params._ || [];

    if (args.length < 1) {
      this.crt.textOut('Usage: umount <virtual_mount_point>');
      this.terminate();
      return;
    }

    const virtual = args[0].endsWith('/') ? args[0] : args[0] + '/';

    // Hapus dari runtime mount (in-memory)
    let mounts = this.fd.nativeMounts || [];
    const before = mounts.length;
    mounts = mounts.filter(mnt => {
      let vMount = mnt.virtual.replace(/\/+$/, '') + '/';
      let vArg = virtual.replace(/\/+$/, '') + '/';
      return vMount !== vArg;
    });
    if (mounts.length === before) {
      this.crt.textOut('Mount point not found (runtime): ' + virtual);
      this.terminate();
      return;
    }
    this.fd.nativeMounts = mounts;
    this.crt.textOut('Mount point unmounted (runtime): ' + virtual);
    this.terminate();
  }
};