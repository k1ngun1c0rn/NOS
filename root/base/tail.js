module.exports = {
  instanceName: "tail",
  name: "tail",
  version: "1.0",
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);
    const n = parseInt(args.params.n || args.params._[0] || 10, 10);
    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      raw = args.params._.slice(1).join("\n");
    }
    raw = raw.trim();
    const lines = raw.split("\n");
    const result = lines.slice(-n).join("\n") + "\n";
    if (this.shell._pipeContextStack && this.shell._pipeContextStack.length > 0) {
      this.shell.lineBuffer = result;
    } else {
      this.crt.textOut(result);
    }
  }
};
