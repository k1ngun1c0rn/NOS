module.exports = {
  instanceName: "tr",
  name: "tr",
  version: "1.0",
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);
    const from = args.params._[0] || "";
    const to = args.params._[1] || "";
    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      raw = args.params._.slice(2).join("\n");
    }
    let result = raw;
    if (from && to) {
      const re = new RegExp("[" + from.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + "]", "g");
      result = raw.replace(re, c => to[from.indexOf(c)] || c);
    }
    if (this.shell._pipeContextStack && this.shell._pipeContextStack.length > 0) {
      this.shell.lineBuffer = result;
    } else {
      this.crt.textOut(result);
    }
  }
};
