module.exports = {
  instanceName: "pwd",
  name: "pwd",
  version: "1.0",
  main: function (nos) {
    this.crt.textOut(this.shell.pwd);
    this.shell.terminate();
  },
};
