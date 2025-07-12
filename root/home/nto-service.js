module.exports = {
  instanceName: "ntoservice",
  name: "NTO Service",
  version: 0.4,
  main: function (os) {
    var devices = [
      { name: "websocket", objectName: "ws" },
      //{ name: "mysql", objectName: "db" }
    ];
    this.failed = !this.shell.loadDevices(devices, this);
    if (this.failed) {
      this.shell.terminate();
      return;
    }
    const path = require("path");
    const ntoMgr = bfs.require("/lib/nto-mgr.js");

    this.ntoManager = new ntoMgr.ntoManager();
    this.allowAccepting = true;

    this.ntoManager.addNTO("01", "Temperature", "number");
    this.ntoManager.addNTO("02", "Humidity", "number");
    this.ntoManager.addNTO("03", "Lightintensity", "number");
    this.ntoManager.addNTO("04", "Soil", "number");

    this.activeSensorListeners = [];

    let args = this.shell.lastCmd.split(" ");
    if (args.length < 3) {
      this.crt.textOut(
        `\r\nSyntax: ${args[0]} <communication device> <port>\r\n`
      );
      this.shell.terminate();
      return;
    }
    this.mqtnl = this.shell.getDevice(args[1]);
    const conn1 = new this.mqtnl.mqtnlConnection(
      this.mqtnl.connMgr,
      parseInt(args[2]),
      (data, sender) => {
        if (this.mqtnl.ESPIOT_enabled === true) {
          if (data.payload.length > 0) {
            let sensorReadings = data.payload.split(";");
            if (sensorReadings.length === 4) {
              // this.crt.textOut(`Incoming from "${sender}": ${data.payload}`);
              sensorReadings.forEach((reading) => {
                let arrPayload = reading.split("=");
                if (arrPayload.length === 2) {
                  let id = arrPayload[0];
                  let value = arrPayload[1];
                  this.pushData(id, value);
                } else {
                  this.crt.textOut(
                    `Invalid data format in: ${reading}, rejected.`
                  );
                }
              });
              conn1.reply(`OK!`, sender);
            } else {
              this.crt.textOut(
                `Invalid number of sensor readings, expected 4 but got ${sensorReadings.length}, data rejected.`
              );
            }
          }
        }
      }
    );

    this.mqtnl.ESPIOT_enabled = true;
    this.msg = `✅ NTO Service starting`;
    this.crt.textOut(this.msg);
    this.ws.remoteFunction.nto = {}; // Create a namespace

    this.ws.remoteFunction.nto.registerSensorListener = (params) => {
      const uuid = params[0];
      if (uuid && !this.activeSensorListeners.includes(uuid)) {
        this.activeSensorListeners.push(uuid);
        // this.crt.textOut(`Registered sensor listener UUID: ${uuid}`);
      }
    };
    this.pushData = async (id, value) => {
      const cleanValue = value.replace(/\0/g, "").trim();

      // Simpan ke memory NTO
      const nto = this.ntoManager.getNTOById(id);
      if (!nto) {
        this.crt.textOut(`ID ${id} not found!`);
        return;
      }

      nto.pushValue(cleanValue);

      // Kirim ke semua listener yang sudah register
      const payload = { type: "sensorUpdate", payload: `${id}=${cleanValue}` };
      this.activeSensorListeners.forEach(uuid => {
        this.ws.sendMessage(`ngs/${uuid}`, payload);
      });
      /*
      // Simpan ke database
      const query = `
        INSERT INTO t_sensor_data (pushtimestamp, sensor_id, sensor_value, device_id)
        VALUES (CURRENT_TIMESTAMP, ?, ?, ?)
      `;
      const params = [parseInt(id), parseInt(cleanValue), 1]; // 🧠 sementara device_id = 1

      await this.db.query(
        "INSERT INTO t_sensor_data (pushtimestamp, sensor_id, sensor_value, device_id) VALUES (CURRENT_TIMESTAMP, ?, ?, ?)",
        [id, cleanValue, id]
      ).catch((err) => {
        this.crt.textOut(`❌ DB Error: ${err.message}`);
      });*/
    };

    this.ws.remoteFunction.nto.registerSensorListener = (params) => {
      const uuid = params[0];
      if (uuid && !this.activeSensorListeners.includes(uuid)) {
        this.activeSensorListeners.push(uuid);
        //this.crt.textOut(`Registered sensor listener UUID: ${uuid}`);
      }
    };

    this.ws.remoteFunction.nto.unregisterSensorListener = (params) => {
      const uuid = params[0];
      const idx = this.activeSensorListeners.indexOf(uuid);
      if (idx !== -1) {
        this.activeSensorListeners.splice(idx, 1);
        //this.crt.textOut(`Unregistered sensor listener UUID: ${uuid}`);
      }
    };

    // Define remote functions
    this.ws.remoteFunction.nto.getData = (params) => {
      if (params[0] === "all") {
        const tempNto = this.ntoManager.getNTOById("01");
        const humidNto = this.ntoManager.getNTOById("02");
        const lightNto = this.ntoManager.getNTOById("03");
        const soilNto = this.ntoManager.getNTOById("04");

        const tempValue = tempNto ? tempNto.getLastValue().value : null;
        const humidValue = humidNto ? humidNto.getLastValue().value : null;
        const lightValue = lightNto ? lightNto.getLastValue().value : null;
        const soilValue = soilNto ? soilNto.getLastValue().value : null;

        return `01=${tempValue || 0};02=${humidValue || 0};03=${lightValue || 0
          };04=${soilValue || 0}`;
      } else {
        let id = params[0];
        let nto = this.ntoManager.getNTOById(id);
        if (nto != null) {
          let lastValue = nto.getLastValue();
          const now = Date.now();
          const age = now - lastValue.timeStamp;
          return lastValue;
        } else return null;
      }
    };

    this.ws.remoteFunction.nto.getList = () => {
      return this.ntoManager.getNTOList().map((n) => {
        return {
          id: n.id,
          name: n.name,
          type: n.dataType,
        };
      });
    };
    // this.shell.terminate();
  },
  // 🎖️ exitSignal pakai Promise
  exitSignal: function () {
    return new Promise((resolve, reject) => {
      // Simulasi cleanup dengan delay (misal: koordinasi network, log)
      setTimeout(() => {
        if (this.mqtnl) this.mqtnl.ESPIOT_enabled = false;

        resolve(); // Wajib panggil resolve biar core tahu selesai
      }, 500); // simulasi delay
    });
  },
};
