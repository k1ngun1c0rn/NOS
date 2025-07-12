class mqtnlConnMgr {
  constructor(nos, hostAddress, hostPort, hostName = null, transportLib = null) {
    const mqtnl = bfs.require(`/lib/mqttNetworkLib.js`);

    this.name = "comm";
    this.devClass = "Connection Manager";
    this.version = 0.1;
    this.mqtnl = mqtnl;
    this.hostName = nos.hostName;
    this.mqtnlConnection = this.mqtnl.mqtnlConnection;
    if (hostName != null) this.hostName = hostName;
    try {
      this.connMgr = new this.mqtnl.connectionManager(this.hostName, {
        server: hostAddress,
        port: hostPort,
        mqttLib: transportLib,
      });
      this.connMgr.deviceName = this.name;
    } catch (e) {
      console.error(e);
    }

    this.connMgr.activeSecurityAgentName = "none";
    this.connMgr.connect();
  }
}

module.exports = { mqtnlConnMgr };
