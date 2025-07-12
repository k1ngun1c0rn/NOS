module.exports = {
  instanceName: "head",
  name: "head",
  version: "1.0",
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);
    const n = parseInt(args.params.n || args.params._[0] || 10, 10);
    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      raw = args.params._.slice(1).join("\n");
    }
    const lines = raw.split("\n").slice(0, n).join("\n") + "\n";
    if (this.shell._pipeContextStack && this.shell._pipeContextStack.length > 0) {
      this.shell.lineBuffer = lines;
    } else {
      this.crt.textOut(lines);
    }
  }
};
