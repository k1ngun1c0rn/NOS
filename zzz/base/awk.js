module.exports = {
  instanceName: "awk",
  name: "awk",
  version: "1.0",
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);
    const paramsArr = Array.isArray(args.params._) ? args.params._ : [];
    const expr = args.params.e || args.params.expr || paramsArr[0] || "$0";
    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      raw = paramsArr.slice(1).join("\n");
    }
    const result = raw.split("\n").map(line => {
      const fields = line.split(/\s+/);
      let out = expr;
      for (let i = 1; i <= fields.length; i++) {
        out = out.replace(new RegExp("\\$" + i, "g"), fields[i - 1] || "");
      }
      out = out.replace(/\$0/g, line);
      // Hapus sisa $N yang tidak tergantikan
      out = out.replace(/\$\d+/g, "");
      return out.trim();
    }).join("\n") + "\n";
    if (this.shell._pipeContextStack && this.shell._pipeContextStack.length > 0) {
      this.shell.lineBuffer = result;
    } else {
      this.crt.textOut(result);
    }
  }
};
