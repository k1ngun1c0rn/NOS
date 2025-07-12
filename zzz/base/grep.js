module.exports = {
  instanceName: "grep",
  name: "grep",
  version: "1.1",
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);
    const keyword = args.params._.join(" ");

    let raw = this.shell.lineBuffer;
    if (!raw || raw.trim() === "") {
      // Mode mandiri: input dari argumen
      raw = keyword;
    }

    const lines = raw.split("\n");

    function highlightPhrase(text, phrase) {
      const red = "\x1b[31m",
        reset = "\x1b[0m";
      const regex = new RegExp(
        phrase.replace(/[-\/\\^$.*+?()[$]{|}]/g, "\\$&"),
        "g"
      );
      return text.replace(regex, `${red}${phrase}${reset}`);
    }

    let result = "";

    for (const line of lines) {
      if (line.includes(keyword)) {
        result += highlightPhrase(line, keyword) + "\n";
      }
    }

    if (
      this.shell._pipeContextStack &&
      this.shell._pipeContextStack.length > 0
    ) {
      this.shell.lineBuffer = result;
    } else {
      this.crt.textOut(result);
    }
  },
};
