module.exports = {
  instanceName: "wrap",
  name: "wrap",
  version: "1.0",
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);
    const n = parseInt(args.params.n || args.params._[0] || 4, 10);
    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      raw = (Array.isArray(args.params._) ? args.params._.slice(1) : []).join("\n");
    }
    const result = raw.split("\n").map(line => {
      const words = line.trim().split(/\s+/);
      let out = [];
      for (let i = 0; i < words.length; i += n) {
        out.push(words.slice(i, i + n).join(" "));
      }
      return out.join("\n");
    }).join("\n");
    if (this.shell._pipeContextStack && this.shell._pipeContextStack.length > 0) {
      this.shell.lineBuffer = result + "\n";
    } else {
      this.crt.textOut(result + "\n");
    }
  }
};
