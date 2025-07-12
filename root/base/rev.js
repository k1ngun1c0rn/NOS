module.exports = {
  instanceName: "rev",
  name: "rev",
  version: "1.0",
  main: function (nos) {
    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      const args = this.shell.parseCommand(this.shell.lastCmd);
      raw = args.params._.join("\n");
    }
    const result = raw.split("\n").map(line => line.split("").reverse().join("")).join("\n") + "\n";
    if (this.shell._pipeContextStack && this.shell._pipeContextStack.length > 0) {
      this.shell.lineBuffer = result;
    } else {
      this.crt.textOut(result);
    }
  }
};
