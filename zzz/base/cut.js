module.exports = {
  instanceName: "cut",
  name: "cut",
  version: "1.0",
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);
    const paramsArr = Array.isArray(args.params._) ? args.params._ : [];
    const delim = args.params.d || args.params.delim || "\t";
    const field = parseInt(args.params.f || args.params.field || paramsArr[0] || 1, 10) - 1;
    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      raw = paramsArr.slice(1).join("\n");
    }
    const result = raw.split("\n").map(line => {
      let cols;
      if (delim === " ") {
        cols = line.trim().split(/\s+/);
      } else {
        cols = line.split(delim);
      }
      return cols[field] || "";
    }).join("\n") + "\n";
    if (this.shell._pipeContextStack && this.shell._pipeContextStack.length > 0) {
      this.shell.lineBuffer = result;
    } else {
      this.crt.textOut(result);
    }
  }
};
