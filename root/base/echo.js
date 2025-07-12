module.exports = {
  instanceName: "echo",
  name: "echo",
  version: "1.0",
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);
    if (args.rawArgs.length < 1) {
      this.crt.textOut("Usage: echo <text>");
      this.shell.terminate();
      return;
    }

    let text = args.params._.join(" ");

    // 🔥 Escape parser
    const unescapeText = (str) => {
      return str
        .replace(/\\n/g, "\n")
        .replace(/\\t/g, "\t")
        .replace(/\\r/g, "\r")
        .replace(/\\b/g, "\b")
        .replace(/\\f/g, "\f")
        .replace(/\\v/g, "\v")
        .replace(/\\'/g, "'")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    };

    const result = unescapeText(text);
    this.crt.textOut(result);
  },
};
