module.exports = {
  name: "cat",
  version: 0.22,
  main: async function (nos) {
    // Memuat fileDriver sebagai device
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);
    // this.display = this.shell.crt;
    const path = this.shell.pathLib;
    // Parsing command-line arguments
    const args = this.shell.parseCommand(this.shell.lastCmd);

    const showSyntax = () => {
      this.crt.textOut(`Syntax: ${args.command} <filename>`);
      this.terminate();
    };

    if (!args.params._) {
      showSyntax();
      return;
    }

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

    const filename = resolvePathHelper(args.params._[0]);
    const useHighlight = args.params['-hl'] === true || args.params['hl'] === undefined && args._flags && args._flags.includes('--hl');

    try {
      let fileContent = await this.fd.readFileSync(filename);
      if (filename.endsWith(".js") && (useHighlight)) {
        const hljs = require("highlight.js");

        // ANSI escape codes untuk warna
        const ANSI_RESET = "\x1b[0m";
        const ANSI_BLUE = "\x1b[34m"; // Warna biru
        const ANSI_GREEN = "\x1b[32m"; // Warna hijau
        const ANSI_CYAN = "\x1b[36m"; // Warna cyan
        const ANSI_YELLOW = "\x1b[33m"; // Warna kuning
        const ANSI_RED = "\x1b[31m"; // Warna merah
        const ANSI_MAGENTA = "\x1b[35m"; // Warna magenta
        const ANSI_WHITE = "\x1b[37m"; // Warna putih
        const ANSI_BLACK = "\x1b[30m"; // Warna hitam
        const ANSI_GRAY = "\x1b[90m"; // Warna abu-abu
        const ANSI_BRIGHT_RED = "\x1b[91m"; // Warna merah terang
        const ANSI_BRIGHT_GREEN = "\x1b[92m"; // Warna hijau terang
        const ANSI_BRIGHT_YELLOW = "\x1b[93m"; // Warna kuning terang
        const ANSI_BRIGHT_BLUE = "\x1b[94m"; // Warna biru terang
        const ANSI_BRIGHT_MAGENTA = "\x1b[95m"; // Warna magenta terang
        const ANSI_BRIGHT_CYAN = "\x1b[96m"; // Warna cyan terang
        const ANSI_BRIGHT_WHITE = "\x1b[97m"; // Warna putih terang

        // Fungsi untuk menyoroti kode dan mengubahnya menjadi ANSI escape codes
        function highlightCode(code, language) {
          // const highlighted = hljs.highlight(language, code).value;
          const highlighted = hljs.highlight(code, {
            language: language,
          }).value;

          // Mengganti tag HTML dengan ANSI escape codes
          return (
            highlighted
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&#x27;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/{/g, ANSI_GREEN + "{" + ANSI_RESET)
              .replace(/}/g, ANSI_GREEN + "}" + ANSI_RESET)
              // .replace(/\(/g, ANSI_MAGENTA+"("+ANSI_RESET)
              // .replace(/\)/g, ANSI_MAGENTA+")"+ANSI_RESET)
              .replace(/<span class="hljs-keyword">/g, ANSI_BRIGHT_BLUE)
              .replace(/<span class="hljs-title function_">/g, ANSI_CYAN)
              .replace(/<span class="hljs-string">/g, ANSI_GREEN)
              .replace(/<span class="hljs-variable language_">/g, ANSI_YELLOW)
              .replace(/<span class="hljs-number">/g, ANSI_RED)
              .replace(/<span class="hljs-params">/g, ANSI_RESET) // Menambahkan penggantian untuk params
              .replace(/<span class="hljs-property">/g, ANSI_BRIGHT_GREEN)
              .replace(/<span class="hljs-function">/g, ANSI_BRIGHT_MAGENTA)
              .replace(/<span class="hljs-attr">/g, ANSI_RESET)
              .replace(/<span class="hljs-subst">/g, ANSI_MAGENTA)
              .replace(/<span class="hljs-comment">/g, ANSI_GRAY)
              .replace(/<span class="hljs-built_in">/g, ANSI_BRIGHT_MAGENTA)
              .replace(/<span class="hljs-literal">/g, ANSI_BRIGHT_YELLOW)
              .replace(/<span class="hljs-title class_">/g, ANSI_RESET)
              .replace(/<span class="hljs-type">/g, ANSI_YELLOW)
              .replace(/<span class="hljs-doctag">/g, ANSI_BRIGHT_BLUE)

              .replace(/<\/span>/g, ANSI_RESET)
          ); // Menghapus tag penutup dan reset warna
        }
        fileContent = highlightCode(fileContent, "javascript");
      }
      this.crt.textOut(fileContent);
      this.shell.terminate();
    } catch (e) {
      this.crt.textOut(e);
    }
  },
};
