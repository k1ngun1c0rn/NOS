// Developed by Canding
// NOS: A Framework Forged by Mind and Machine

// const vm = require("vm");
// const fs = require("fs");
// const path = require("path");
const crypto = require("crypto");

class NOS {
  constructor(args) {
    this.codeName = "Tectona Grandis";
    this.version = "0.394";
    this.author = "Andriansah";
    this.devices = [];
    this.runApps = [];
    this.args = args;
    this.basePath = "";
  }

  /**
   * Mount device ke dalam sistem.
   * @param {Object} device - Objek perangkat dengan properti `name`.
   */
  mountDevice(device) {
    if (!device || !device.name) {
      console.error("Device harus memiliki properti `name`.");
      return;
    }

    const baseName = device.name;
    let index = 0;

    // Generate unique ID berdasarkan waktu dan angka acak
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Periksa apakah perangkat sudah ada di daftar berdasarkan ID unik
    if (this.devices.some((dev) => dev.uniqueId === uniqueId)) {
      console.log(`'${device.name}' already mounted.`);
      return; // Hindari mounting perangkat yang sama berdasarkan ID unik
    }

    // Periksa apakah nama perangkat sudah ada di daftar
    while (this.devices.some((dev) => dev.name === device.name)) {
      //if (isNaN(device.name.substr(-1))) index=2; else
      index++;
      device.name = `${baseName}${index}`;
    }

    // Menetapkan ID unik untuk perangkat berdasarkan waktu dan angka acak
    device.uniqueId = uniqueId;

    this.devices.push(device);
    // console.log(`'${device.name}' succesfully mounted ID: '${device.uniqueId}'.`);
  }

  /**
   * Unmount device dari sistem.
   * @param {string} deviceName - Nama perangkat yang ingin di-unmount.
   */
  unmountDevice(deviceName) {
    const deviceIndex = this.devices.findIndex(
      (dev) => dev.name === deviceName,
    );
    if (deviceIndex === -1) {
      console.error(`Device '${deviceName}' fail to access!`);
      return;
    }

    this.devices.splice(deviceIndex, 1);
    console.log(`Device '${deviceName}' berhasil di-unmount.`);
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async executeModule(modulePath, filename, callback, shell, root = true, params) {
    // const moduleFullPath = path.resolve(__dirname, modulePath, filename);
    if (!modulePath.endsWith("/")) modulePath += "/";
    const moduleFullPath = modulePath + filename;
    // console.log("$$" + modulePath + "|" + filename);
    try {
      // Hapus module dari cache sebelum menjalankan ulang
      // delete require.cache[require.resolve(moduleFullPath)];

      // Menggunakan require untuk mengeksekusi module
      const xmodule = bfs.require(moduleFullPath, { noCache: true });
      if (xmodule.needRoot === true && !root) {
        throw {
          code: 3,
          message: "Insufficient permission, use sudo command",
          stack: "",
        };
      } else {
        // Pass the 'this' context (instance of NOS) to the module
        if (typeof xmodule.main === "function") {
          if (shell != null) xmodule.shell = shell;
          if (root === true) xmodule.os = this;

          //delete __APP[xmodule.instanceName]; // 🧹 Bersihkan dulu

          if (xmodule.instanceName) {
            //   console.log(`@@@${xmodule.instanceName} = xmodule.main;`);
            // eval(`__APP.${xmodule.instanceName} = xmodule;`);
            __APP[xmodule.instanceName] = xmodule;
          }
          xmodule.args = params;
          if (shell) {
            if (shell.crt) xmodule.crt = shell.crt;
            if (shell.terminate) xmodule.terminate = () => shell.terminate();
          }
          xmodule.uuid = crypto.randomUUID(); // Generate a unique ID for the instance
          // if (xmodule.instanceName)
          //   __APP[xmodule.instanceName].main(root === true ? this : null); else // Passing the NOS instance
          await xmodule.main(root === true ? this : null); // Passing the NOS instance

          this.runApps.push({
            pid: this.runApps.length + 1,
            filename: filename,
            instance: xmodule,
          });
          if (callback) {
            callback(); // Menjalankan callback setelah eksekusi
          }
        } else {
          throw {
            code: 1,
            message: `Module '${filename}' tidak memiliki fungsi 'main'.`,
            stack: "",
          };
        }
      }
    } catch (error) {
      throw {
        code: 2,
        message: `Core error at module '${filename}': ${error.message}\n${error.stack}`,
      };
    }
  }

  // Method baru untuk mendapatkan device berdasarkan nama
  getDevice(deviceName) {
    const device = this.devices.find((dev) => dev.name === deviceName);
    if (!device) {
      console.error(`Device '${deviceName}' not found.`);
      return null;
    }
    return device;
  }

  loadDevices(devices, dst = this) {
    devices.forEach((device) => {
      const { name, objectName } = device;
      const foundDevice = this.devices.find((dev) => dev.name === name);

      if (!foundDevice) {
        console.error(`Device '${name}' not found.`);
        return false;
      }

      if (!objectName) {
        console.error(`Device '${name}' tidak memiliki objectName.`);
        return false;
      }

      dst[objectName] = foundDevice; // Tambahkan device ke properti target
      // console.log(`Device '${name}' di-load sebagai '${objectName}'.`);
    });
    return true;
  }

  // for compatibility purpose
  unRegisterApp() { }
  registeredApp() { }
  // end of for compatibility purpose

  async shutdown(errorLevel) {
    console.log("Sending exit signal to all script ...");
    for (let i = 0; i < this.runApps.length; i++) {
      const app = this.runApps[i];
      if (typeof app.instance.exitSignal === "function") {
        try {
          // Support Promise-based exitSignal()
          const result = app.instance.exitSignal();
          if (result && typeof result.then === "function") {
            await result;
          }
        } catch (e) {
          console.log(`⚠️ exitSignal error in ${app.filename}: ${e.message}`);
        }
      }
    }

    process.stdout.write("Closing BFS ...");
    bfs.close();
    process.stdout.write(" done.\n");

    setTimeout(() => {
      process.exit(errorLevel);
    }, 500);
  }
}

module.exports = { NOS };
