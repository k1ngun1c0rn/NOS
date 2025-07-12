module.exports = {
  name: "less",
  description: "View text page by page with scroll and pipe support",
  version: "1.4",
  needRoot: false,
  main: function (nos) {
    this.display = this.shell.crt;
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);
    const path = this.shell.pathLib;

    const resolvePathHelper = (rawPath) => {
      const homeDirectory = this.shell.home || '/home';
      const currentWorkingDirectory = this.shell.pwd;

      if (rawPath === '~') rawPath = '~/'
      else if (rawPath === '.') rawPath = './'

      if (rawPath.startsWith('~/')) {
        return path.posix.join(homeDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith('./')) {
        return path.posix.join(currentWorkingDirectory, rawPath.substring(2));
      } else if (rawPath.startsWith('/')) {
        return rawPath; // Absolute path  
      } else {
        // Relative to current working directory
        return path.posix.join(currentWorkingDirectory, rawPath);
      }
    };

    const args = this.shell.lastCmd.split(" ");
    const filePath = args[1] ? resolvePathHelper(args[1].trim()) : null;
    const inputText = this.shell.lineBuffer || "";

    this.hlEnable = args.includes("--hl");
    this.active = true;

    const hljs = require("highlight.js");

    const highlightCode = (code, lang = "javascript") => {
      const ANSI_RESET = "\x1b[0m";
      return hljs
        .highlight(lang, code)
        .value.replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/{/g, "\x1b[32m{\x1b[0m") // green
        .replace(/}/g, "\x1b[32m}\x1b[0m")
        .replace(/<span class="hljs-keyword">/g, "\x1b[94m") // bright blue
        .replace(/<span class="hljs-title function_">/g, "\x1b[36m") // cyan
        .replace(/<span class="hljs-string">/g, "\x1b[32m") // green
        .replace(/<span class="hljs-variable">/g, "\x1b[33m") // yellow
        .replace(/<span class="hljs-number">/g, "\x1b[31m") // red
        .replace(/<span class="hljs-comment">/g, "\x1b[90m") // gray
        .replace(/<\/span>/g, ANSI_RESET);
    };

    let PAGE_SIZE = this.shell.crt.rows;
    let contentLines = [];
    let currentLine = this.shell.crt.rows;
    let displayedLines = this.shell.crt.rows;

    const hideCursor = () => this.display.write("\u001B[?25l");
    const showCursor = () => this.display.write("\u001B[?25h");
    const setCursor = (row, col) => this.display.write(`\x1b[${row};${col}H`);

    const scrollUp = () => {
      if (currentLine > contentLines.length) return;
      this.display.write(`\x1B[1S`);
      setCursor(PAGE_SIZE, 1);
      // this.dsisplay.write(" ".repeat(this.shell.crt.columns - 2) + `\x1B[70D`);
      this.display.write(`\r${contentLines[currentLine - 1]}`);
      currentLine++;
    };

    const scrollDown = () => {
      if (currentLine - PAGE_SIZE - 2 < 0) return;
      this.display.write(`\x1B[1T`);
      setCursor(1, 1);
      currentLine--;
      this.display.write(`\r${contentLines[currentLine - PAGE_SIZE - 1]}`);
    };

    const displayInitialContent = () => {
      this.display.clear();
      const end = Math.min(PAGE_SIZE, contentLines.length);
      for (let i = 0; i < end - 1; i++) {
        this.display.write(contentLines[i] + "\n");
        displayedLines++;
      }
      this.display.write(contentLines[end - 1]);
      currentLine = end + 1;
    };

    const handleInput = (key) => {
      // console.log(JSON.stringify(key))
      if (key.sequence == "\x1B[B") scrollUp();
      else if (key.sequence == "\x1B[A") scrollDown();
      else if (key.sequence == "\x1B[5~") {
        if (currentLine <= PAGE_SIZE) return;
        const start = Math.max(0, currentLine - PAGE_SIZE * 2);
        this.display.clear();
        setCursor(1, 1);
        for (let i = 0; i < PAGE_SIZE; i++) {
          if (start + i < contentLines.length)
            this.display.write(contentLines[start + i] + "\n");
        }
        currentLine = start + PAGE_SIZE;
      } else if (key.sequence == "\x1B[6~") {
        if (currentLine >= contentLines.length) return;
        this.display.clear();
        setCursor(1, 1);
        for (let i = 0; i < PAGE_SIZE; i++) {
          if (currentLine + i < contentLines.length)
            this.display.write(contentLines[currentLine + i] + "\n");
        }
        currentLine += PAGE_SIZE;
      } else if ((key.name.toLowerCase() === "q") || (key.name == "\x03" && key.ctrl === true)) {
        this.display.clear();
        showCursor();
        this.shell.keyboardActive = true;
        this.active = false;
        this.shell.terminate();
      } else {
        // console.log(JSON.stringify(key))
        // this.crt.textOut(
        //   "Gunakan panah atas/bawah, PageUp/PageDown, atau 'q' untuk keluar.\n"
        // );
      }
    };

    const loadContent = () => {
      hideCursor();
      let data = "";

      if (inputText.trim() !== "") {
        data = inputText;
        if (this.hlEnable) data = highlightCode(data);
      } else if (filePath) {
        data = this.fd.readFileSync(filePath);
        if (this.hlEnable) data = highlightCode(data, "javascript");
      } else {
        this.crt.textOut("Usage: less <file> atau gunakan pipe.\n");
        this.shell.terminate();
        return;
      }

      contentLines = data.split("\n");
      displayInitialContent();

      this.shell.keyboardActive = false;
      this.shell.getKey = (io) => {
        if (this.active) handleInput(io.key);
      };
    };

    loadContent();

    this.shell.interruptSignalListener.push(() => {
      this.shell.keyboardActive = true;
      this.active = false;
    });
  },
};
