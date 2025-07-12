module.exports = {
  instanceName: "ed",
  name: "ed",
  version: 0.1,
  main: async function (nos) {
    // Memuat fileDriver sebagai device
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);
    this.display = this.shell.crt;
    let infinite = 1;
    // Parsing command-line arguments
    const args = this.shell.parseCommand(this.shell.lastCmd);

    const showSyntax = () => {
      this.display.textOut(`ed, a simple line-based text editor.\n`);
      this.display.textOut(`Syntax: ${args.command} <filename>`);
      this.shell.terminate();
    };

    if (!args.params._) {
      showSyntax();
      return;
    }

    const filename = this.shell.pwd + args.params._[0];
    let content = "";
    let lines = [];
    try {
      content = this.fd.readFileSync(filename);
      lines = content.split("\n");
    } catch (e) {
      content = "";
    }

    let changed = false;
    this.display.textOut(`Editing: ${filename} (type .help for commands)`);

    const prompt = () => {
      //this.display.textOut(`ed> `, false);
    };

    const help = () => {
      this.display.textOut(
        [
          ".q           Quit (tanpa simpan)",
          ".w           Write/save file",
          ".p           Print content",
          ".i N teks    Insert teks di baris N (1-based)",
          ".u N teks    Update teks di baris N (1-based)",
          ".a N teks    Append teks setelah baris N (1-based)",
          ".d N         Delete baris N",
          ".l           List jumlah baris & status",
          ".clear       Hapus seluruh isi",
          "..<cmd>      Tulis literal baris yang diawali titik (misal: ..q untuk .q)",
          ".h/.help     Help",
        ].join("\n"),
      );
    };

    const printContent = () => {
      lines.forEach((l, i) => {
        this.display.textOut(`${i + 1}: ${l}`);
      });
    };

    const handleInput = (input) => {
      // Escape: jika ingin menulis literal . di awal baris, gunakan ..<perintah>
      if (input.startsWith("..")) {
        lines.push(input.slice(1));
        changed = true;
        prompt();
        return;
      }
      if (input === ".q") {
        if (changed) this.display.textOut("Keluar tanpa simpan.");
        this.shell.keyboardActive = true;
        this.shell.terminate();
        this.shell.getKey = null;
        infinite = 0;
        return;
      }
      if (input === ".w") {
        try {
          this.fd.writeFileSync(filename, lines.join("\n"));
          this.display.textOut("File saved.");
          changed = false;
        } catch (e) {
          this.display.textOut("Gagal menyimpan file.");
        }
        prompt();
        return;
      }
      if (input === ".p") {
        printContent();
        prompt();
        return;
      }
      if (input.startsWith(".u ")) {
        // .u N teks
        let parts = input.split(" ");
        let n = parseInt(parts[1], 10) - 1;
        let teks = parts.slice(2).join(" ");
        if (teks.startsWith("..")) teks = teks.slice(1); // Escape: ..jadi .
        if (!isNaN(n) && n >= 0 && n < lines.length) {
          lines[n] = teks;
          changed = true;
          this.display.textOut(`Updated line ${n + 1}`);
        } else {
          this.display.textOut("Baris tidak valid.");
        }
        prompt();
        return;
      }
      if (input.startsWith(".i ")) {
        // .i N teks
        let parts = input.split(" ");
        let n = parseInt(parts[1], 10) - 1;
        let teks = parts.slice(2).join(" ");
        if (teks.startsWith("..")) teks = teks.slice(1); // Escape: ..jadi .
        if (!isNaN(n) && n >= 0 && n <= lines.length) {
          lines.splice(n, 0, teks);
          changed = true;
          this.display.textOut(`Inserted at line ${n + 1}`);
        } else {
          this.display.textOut("Baris tidak valid.");
        }
        prompt();
        return;
      }
      if (input.startsWith(".a ")) {
        // .a N teks
        let parts = input.split(" ");
        let n = parseInt(parts[1], 10) - 1;
        let teks = parts.slice(2).join(" ");
        if (teks.startsWith("..")) teks = teks.slice(1); // Escape: ..jadi .
        if (!isNaN(n) && n >= 0 && n < lines.length) {
          lines.splice(n + 1, 0, teks);
          changed = true;
          this.display.textOut(`Appended after line ${n + 1}`);
        } else {
          this.display.textOut("Baris tidak valid.");
        }
        prompt();
        return;
      }
      if (input.startsWith(".p ")) {
        // .p N n  (n bisa $n untuk seluruhnya setelah N)
        let parts = input.split(" ");
        let start = parseInt(parts[1], 10) - 1;
        let count = 1;
        if (parts[2] && parts[2].trim() === "$n") {
          count = lines.length - start;
        } else if (parts[2]) {
          count = parseInt(parts[2], 10);
        }
        if (
          !isNaN(start) &&
          start >= 0 &&
          start < lines.length &&
          !isNaN(count) &&
          count > 0
        ) {
          for (let i = start; i < Math.min(start + count, lines.length); i++) {
            this.display.textOut(`${i + 1}: ${lines[i]}`);
          }
        } else {
          this.display.textOut(
            "Format: .p N n  (N=baris awal, n=jumlah baris, atau $n untuk seluruhnya)",
          );
        }
        prompt();
        return;
      }
      if (input === ".l") {
        this.display.textOut(
          `${lines.length} lines${changed ? ", changed" : ""}`,
        );
        prompt();
        return;
      }
      if (input === ".clear") {
        lines = [];
        changed = true;
        this.display.textOut("Buffer cleared.");
        prompt();
        return;
      }
      if (input.startsWith(".d ")) {
        // .d N
        let n = parseInt(input.split(" ")[1], 10) - 1;
        if (!isNaN(n) && n >= 0 && n < lines.length) {
          lines.splice(n, 1);
          changed = true;
          this.display.textOut(`Deleted line ${n + 1}`);
        } else {
          this.display.textOut("Baris tidak valid.");
        }
        prompt();
        return;
      }
      if (input === ".h" || input === ".help") {
        help();
        prompt();
        return;
      }
      // Default: append as new line
      lines.push(input + "");
      changed = true;
      prompt();
    };

    // help();
    // printContent();
    // prompt();

    this.shell.interruptSignalListener.push(() => {
      infinite = 0;
    });

    while (infinite) {
      let cmd = await this.shell.userPrompt("ed> ", true);
      if (cmd == "exit") break;
      else {
        if (infinite)
          // this.crt.textOut("cmd: " + cmd)
          handleInput(cmd);
      }
    }
  },
};
