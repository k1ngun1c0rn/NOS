module.exports = {
  name: "ifconfig",
  version: 0.5,
  description: "Tampilkan daftar koneksi mqtnl aktif",
  author: "Andriansah",
  needRoot: true,
  main: function (nos) {
    this.display = this.shell.crt;

    this.display.textOut("NOS ifconfig - Daftar koneksi MQTNL:\n");

    for (let devName in nos.devices) {
      const dev = nos.devices[devName];
      if (
        dev.connMgr &&
        typeof dev.connMgr === "object" &&
        dev.connMgr.constructor.name === "connectionManager"
      ) {
        let secretkey = ""
        let agent = __APP.core.encryption.getInstance(dev.connMgr.activeSecurityAgentName);
        secretkey = agent?.key ? agent.key.toString("hex") : "";
        if (secretkey?.length > 4) secretkey = secretkey?.substring(0, 4) + "***"; 

        this.display.textOut(`📡 Device: ${dev.name || "(no-name)"}`);
        this.display.textOut(`   Host ID   : ${dev.hostName}`);
        this.display.textOut(`   Server    : ${dev.connMgr.options.server}:${dev.connMgr.options.port}`);
        this.display.textOut(`   Security  : ${dev.connMgr.activeSecurityAgentName} ${secretkey.trim() != ""?"Key":""} ${secretkey}`);
        if (dev.description)
          this.display.textOut(`   Description : ${dev.description}`);
        this.display.textOut("");
      }
    }
    this.display.textOut(`   Default Interface : ${__APP.defaultComm}`);

    this.shell.terminate();
  }
}
