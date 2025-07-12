module.exports = {
  instanceName: "uniq",
  name: "uniq",
  version: "1.0",
  main: function (nos) {
    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      const args = this.shell.parseCommand(this.shell.lastCmd);
      raw = args.params._.join("\n");
    }
    const lines = raw.split("\n");
    const result = lines.filter((line, i, arr) => i === 0 || line !== arr[i - 1]).join("\n") + "\n";
    if (this.shell._pipeContextStack && this.shell._pipeContextStack.length > 0) {
      this.shell.lineBuffer = result;
    } else {
      this.crt.textOut(result);
    }
  }
};
