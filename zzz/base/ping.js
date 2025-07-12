module.exports = {
  name: "mqtnl ping",
  version: 0.4,
  main: function (nos) {
    var devices = [
      { name: __APP.defaultComm, objectName: "mqtnl" },
      { name: "nimbus", objectName: "nimbus" },
    ];
    this.shell.loadDevices(devices, this);
    this.display = this.crt;
    let args = this.shell.lastCmd.split(" ");
    if (args.length == 1) {
      this.display.textOut(`Syntax: ${args[0]} <host>`);
      this.shell.terminate();
    } else {
      this.mqtnl.connMgr.pingResetSequence();
      this.controller = this.mqtnl.connMgr.pingController(args[1], 2000);
      let first = true;
      this.doPing = (interval) => {
        this.pinger = setTimeout(() => {
          first = false;
          this.controller.ping()
            .then((data) => {
              this.display.textOut(data)
              this.doPing(interval);
            })
            .catch((err) => {
              this.display.textOut(err)
              this.doPing(interval);
            });
        }, first ? 0 : interval);
      }

      this.doPing(1000);

      this.unsubscribeNimbus = this.nimbus.subscribe("SYSTEM", (data) => {
        if (data && data.message === "SIGINT" && data.targetShellId === this.shell.id) {
          clearTimeout(this.pinger);
          this.controller.interrupt();
          this.unsubscribeNimbus();
        }
      });
    }
  }
}