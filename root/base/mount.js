module.exports = {
  name: "mount",
  version: 0.2,
  main: function (nos) {
    const path = require('path');
    const CONF_PATH = '/opt/conf/mountpoints.json';
    this.shell.loadDevices([{ name: "bfsAccess", objectName: "fd" }], this);

    const argsObj = this.shell.parseCommand(this.shell.lastCmd);
    const args = argsObj.params._ || [];
    // console.log('argsObj:', argsObj);
    function loadMounts() {
      try {
        if (this.fd.existsSync(CONF_PATH)) {
          const data = this.fd.readFileSync(CONF_PATH, 'utf8');
          return JSON.parse(data);
        }
      } catch (e) {
        this.crt.textOut('Error loading mountpoints config: ' + e.message);
      }
      return [];
    }

    function saveMounts(mounts) {
      try {
        this.fd.writeFileSync(CONF_PATH, JSON.stringify(mounts, null, 2), 'utf8');
        return true;
      } catch (e) {
        this.crt.textOut('Error saving mountpoints config: ' + e.message);
        return false;
      }
    }

    const printUsage = () => {
      this.crt.textOut('Usage:');
      this.crt.textOut('  mount <virtual> <real> [handler]      # mount runtime (tidak ke config)');
      this.crt.textOut('  mount umount <virtual>                # unmount runtime (tidak ke config)');
      this.crt.textOut('  mount add <virtual> <real> [handler]  # add to /opt/conf/mountpoints.json');
      this.crt.textOut('  mount remove <virtual>                # remove from /opt/conf/mountpoints.json');
      this.crt.textOut('  mount load                         # reload runtime from config');
      this.crt.textOut('  mount list                           # list runtime mount');
      this.crt.textOut('  mount conf                           # list config automount');
    };

    if (argsObj.params.length === 0) {
      printUsage();
      this.terminate();
      return;
    }

    let mounts = this.fd.nativeMounts || [];
    let confMounts = loadMounts.call(this);

    if (args[0] === 'lmdbmount') {
      mounts.push({
        virtual: "/lmdb/",
        real: "",
        handler: nos.getDevice("bfsAccess1"),
        handlerName: 'lmdb'
      });
      this.fd.nativeMounts = mounts;
      this.crt.textOut('LMDB Mounted');
      this.terminate();
      return;
    }


    // mount list: tampilkan runtime
    if (args[0] === 'list') {
      if (!mounts.length) {
        this.crt.textOut('No runtime mount points.');
      } else {
        for (const mnt of mounts) {
          this.crt.textOut(mnt.virtual + ' -> ' + mnt.real + ' [handler: ' + (mnt.handlerName || 'fs') + ']');
        }
      }
      this.terminate();
      return;
    }
    // mount conf: tampilkan config
    if (args[0] === 'conf') {
      if (!confMounts.length) {
        this.crt.textOut('No config mount points.');
      } else {
        for (const mnt of confMounts) {
          this.crt.textOut(mnt.virtual + ' -> ' + mnt.real + ' [handler: ' + (mnt.handler || 'fs') + ']');
        }
      }
      this.terminate();
      return;
    }
    // mount add <virtual> <real> [handler]: tambah ke config
    if (args[0] === 'add' && args.length >= 3) {
      let [_, virtual, real, handler] = args;
      if (!virtual.endsWith('/')) virtual += '/';
      if (!real.endsWith('/')) real += '/';
      const nodefs = require('fs');
      if (!nodefs.existsSync(real)) {
        this.crt.textOut('Error: real directory does not exist: ' + real);
        this.terminate();
        return;
      }
      if (confMounts.some(mnt => mnt.virtual === virtual)) {
        this.crt.textOut('Error: mount point already exists in config: ' + virtual);
        this.terminate();
        return;
      }
      confMounts.push({ virtual, real, handler: handler || 'fs' });
      if (saveMounts.call(this, confMounts)) {
        this.crt.textOut('Mount point added to config: ' + virtual + ' -> ' + real + ' [handler: ' + (handler || 'fs') + ']');
      }
      this.terminate();
      return;
    }
    // mount remove <virtual>: hapus dari config
    if (args[0] === 'remove' && args[1]) {
      const before = confMounts.length;
      confMounts = confMounts.filter(mnt => mnt.virtual !== args[1]);
      if (confMounts.length < before) {
        saveMounts.call(this, confMounts);
        this.crt.textOut('Mount point removed from config: ' + args[1]);
      } else {
        this.crt.textOut('Mount point not found in config: ' + args[1]);
      }
      this.terminate();
      return;
    }
    // mount --load: reload runtime dari config
    if (args[0] == 'load') {
      if (this.fd && typeof this.fd.loadNativeMountsFromConfig === 'function') {
        this.fd.nativeMounts = this.fd.loadNativeMountsFromConfig(CONF_PATH);
        this.crt.textOut('✅ Native mount points reloaded from config.');
      } else {
        this.crt.textOut('Error: bfs driver not available or does not support live reload.');
      }
      // this.terminate();
      return;
    }
    // mount <virtual> <real> [handler]: mount runtime only
    if (args.length >= 2) {
      let [virtual, real, handler] = args;
      if (!virtual.endsWith('/')) virtual += '/';
      if (!real.endsWith('/')) real += '/';
      const nodefs = require('fs');
      if (!nodefs.existsSync(real)) {
        this.crt.textOut('Error: real directory does not exist: ' + real);
        this.terminate();
        return;
      }
      if (mounts.some(mnt => mnt.virtual === virtual)) {
        this.crt.textOut('Error: mount point already exists (runtime): ' + virtual);
        this.terminate();
        return;
      }
      // PATCH: handler harus modul, bukan string
      let handlerMod;
      try {
        handlerMod = require(handler || 'fs');
      } catch (e) {
        this.crt.textOut('Error: cannot require handler module: ' + (handler || 'fs'));
        this.terminate();
        return;
      }
      mounts.push({ virtual, real, handler: handlerMod, handlerName: handler || 'fs' });
      this.fd.nativeMounts = mounts;
      this.crt.textOut('Mount point registered (runtime): ' + virtual + ' -> ' + real + ' [handler: ' + (handler || 'fs') + ']');
      this.terminate();
      return;
    }

    // mount umount <virtual>: unmount runtime only
    if (args[0] === 'umount' && args[1]) {
      const before = mounts.length;
      mounts = mounts.filter(mnt => mnt.virtual !== args[1]);
      if (mounts.length < before) {
        this.fd.nativeMounts = mounts;
        this.crt.textOut('Mount point unmounted (runtime): ' + args[1]);
      } else {
        this.crt.textOut('Mount point not found (runtime): ' + args[1]);
      }
      this.terminate();
      return;
    }
    printUsage();
    this.terminate();
  }
};