module.exports = {
  instanceName: "uppercase",
  name: "uppercase",
  version: "1.0",
  main: function (nos) {
    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      const args = this.shell.parseCommand(this.shell.lastCmd);
      raw = args.params._.join("\n");
    }
    const result = raw.split("\n").map(line => line.toUpperCase()).join("\n") + "\n";
    if (this.shell._pipeContextStack && this.shell._pipeContextStack.length > 0) {
      this.shell.lineBuffer = result;
    } else {
      this.crt.textOut(result);
    }
  }
};
