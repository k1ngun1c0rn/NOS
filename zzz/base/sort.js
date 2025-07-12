module.exports = {
  instanceName: "sort",
  name: "sort",
  version: "1.1",
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);
    const mode = args.params.d || args.params.desc ? "desc" : "asc";

    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      // Mode mandiri: ambil dari argumen
      raw = args.params._.join("\n");
    }
    const lines = raw
      .split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 0);

    lines.sort((a, b) => {
      const cmp = a.localeCompare(b);
      return mode === "desc" ? -cmp : cmp;
    });

    const result = lines.join("\n") + "\n";

    if (this.shell._pipeContextStack && this.shell._pipeContextStack.length > 0) {
      this.shell.lineBuffer = result;
    } else {
      this.crt.textOut(result);
    }
  }
};
