class TermUtil {
  constructor(crt, shell) {
    this.crt = crt;
    this.buf = "";
    this.col = 0;
    this.prompt = "";
    this.shell = shell; // maafkan saya pakai circular reference, karena saya perlu tahu pwd/cwd
    this.echo = true;
    this.isUserInput = false;
    this.userInputCharmask = null;
    this.history = [];
    this.historyIdx = 0;
    // this.autoCompletionList = [];
    this.autoCompletionList = [];
    this.doReturnGetFromHistory = 0;

    // Menambahkan metode tambahan ke String
    String.prototype.replaceAt = function (index, replacement) {
      return (
        this.substring(0, index) +
        replacement +
        this.substring(index + replacement.length)
      );
    };

    String.prototype.splice = function (start, delCount, newSubStr) {
      return (
        this.slice(0, start) +
        newSubStr +
        this.slice(start + Math.abs(delCount))
      );
    };
  }

  findHistory(cmd) {
    return this.history.indexOf(cmd);
  }
  hideCursor() {
    this.crt.write("\u001B[?25l");
  }
  showCursor() {
    this.crt.write("\u001B[?25h");
  }
  searchHistory(cmd) {
    let foundIdx = 0;
    let result = "";
    for (let i = 0; i < this.history.length; i++) {
      if (cmd === this.history[i].substring(0, cmd.length)) {
        if (this.tabSearchIdx === foundIdx) {
          result = this.history[i];
          break;
        }
        foundIdx++;
      }
    }
    return result;
  }

  doCtrlC() { }

  searchCompletion(cmd) {
    let foundIdx = 0;
    let result = "";
    for (let i = 0; i < this.autoCompletionList.length; i++) {
      if (cmd === this.autoCompletionList[i].substring(0, cmd.length)) {
        if (this.tabSearchIdx === foundIdx) {
          result = this.autoCompletionList[i];
          break;
        }
        foundIdx++;
      }
    }
    return result;
  }

  searchAutoComplete(cmd) {
    return this.autoCompletionList.filter((word) => word.startsWith(cmd));
  }

  addHistory(cmd) {
    if (cmd.trim() === "") return;
    if (!this.history.includes(cmd)) {
      this.history.push(cmd);
      return 0;
    }
    return 1;
  }

  displayInColumns(words) {
    const columns = 3;
    const rows = Math.ceil(words.length / columns);
    let columnsArray = Array.from({ length: columns }, () => []);

    words.forEach((word, index) => {
      const columnIndex = index % columns;
      columnsArray[columnIndex].push(word);
    });

    let result = "";
    for (let row = 0; row < rows; row++) {
      let rowString = "";
      for (let col = 0; col < columns; col++) {
        const word = columnsArray[col][row] || "";
        rowString += word.padEnd(10);
      }
      result += rowString + "\n";
    }
    return result;
  }

  doTab() {
    // Ambil kata terakhir (bisa path)
    let beforeCursor = this.buf.slice(0, this.col);
    let match = beforeCursor.match(/(?:^|\s)([^\s]*)$/);
    let lastWord = match ? match[1] : "";

    // Deteksi jika path (ada /)
    let sepIdx = lastWord.lastIndexOf("/");
    let parentDir = sepIdx >= 0 ? lastWord.slice(0, sepIdx + 1) : "";
    let partial = sepIdx >= 0 ? lastWord.slice(sepIdx + 1) : lastWord;

    // Gunakan fs driver untuk ambil isi direktori
    const path = require('path');
    let baseDir = parentDir ? path.resolve((this.shell && this.shell.pwd) || '.', parentDir) : (this.shell && this.shell.pwd) || '.';
    let list = [];
    try {
      list = fs.readdirSync(baseDir);
    } catch (e) { }

    // Filter prefix
    let matches = list.filter(name => name.startsWith(partial));
    // PATCH: filter hanya direktori jika perintah cd
    let onlyDir = false;
    // Cek konteks perintah (hardcoded: jika buf diawali 'cd ' atau 'cd\t')
    const cmdPrefix = this.buf.trimStart().slice(0, 3);
    if (cmdPrefix === 'cd ' || cmdPrefix === 'cd\t') onlyDir = true;
    // --- PATCH: jika cd dan partial kosong, tampilkan semua direktori ---
    if (onlyDir && partial === "") {
      matches = list.filter(name => {
        let stat = null;
        try { stat = fs.statSync(path.join(baseDir, name)); } catch (e) { }
        return stat && stat.isDirectory && stat.isDirectory();
      });
    } else if (onlyDir) {
      matches = matches.filter(name => {
        let stat = null;
        try { stat = fs.statSync(path.join(baseDir, name)); } catch (e) { }
        return stat && stat.isDirectory && stat.isDirectory();
      });
    }
    // Tambahkan / jika direktori
    matches = matches.map(name => {
      let stat = null;
      try { stat = fs.statSync(path.join(baseDir, name)); } catch (e) { }
      if (stat && stat.isDirectory && stat.isDirectory()) return name + "/";
      return name;
    });
    if (matches.length === 1) {
      // Jika direktori, tambahkan / (sudah di atas)
      let completion = matches[0];
      // Replace lastWord di buf dengan completion
      const newBuf = beforeCursor.slice(0, beforeCursor.length - lastWord.length) + parentDir + completion + this.buf.slice(this.col);
      const newCol = (beforeCursor.slice(0, beforeCursor.length - lastWord.length) + parentDir + completion).length;
      // Hapus hanya dari posisi kursor ke kanan
      this.crt.write(`\x1b[0K`);
      // Tulis sisa buffer dari posisi kursor
      this.crt.write(newBuf.slice(this.col));
      // Kembalikan kursor ke posisi baru
      if (newBuf.length > newCol) {
        this.crt.write(`\x1b[${newBuf.length - newCol}D`);
      }
      this.buf = newBuf;
      this.col = newCol;
    } else if (matches.length > 1) {
      // Tampilkan semua opsi autocompletion dalam format kolom rapi
      const maxWidth = 25;
      const columns = Math.floor(this.crt.columns / maxWidth) || 1;
      let line = "";
      this.crt.write("\n");
      matches.forEach((item, index) => {
        line += item.padEnd(maxWidth);
        if ((index + 1) % columns === 0) {
          this.crt.write(line + "\n");
          line = "";
        }
      });
      if (line) this.crt.write(line + "\n");
      if (this.shell.showPrompt) this.shell.showPrompt();
      this.crt.write(this.buf);
    }
    // Bersihkan semua state terkait tab completion/cycling
    this.optionsState = 0;
    this.tabTabState = null;
  }

  // PATCH: handle enter after tab completion
  async doReturn() {
    if (this.tabTabState && this.tabTabState.matches && this.tabTabState.matches.length > 1) {
      // Replace lastWord in buf with selected match
      let beforeCursor = this.buf.slice(0, this.col);
      let match = beforeCursor.match(/(?:^|\s)([^\s]*)$/);
      let lastWord = match ? match[1] : "";
      let sepIdx = lastWord.lastIndexOf("/");
      let parentDir = sepIdx >= 0 ? lastWord.slice(0, sepIdx + 1) : "";
      let completion = this.tabTabState.matches[this.tabTabState.idx];
      const newBuf = beforeCursor.slice(0, beforeCursor.length - lastWord.length) + parentDir + completion + this.buf.slice(this.col);
      this.buf = newBuf;
      this.col = newBuf.length;
      this.tabTabState = null;
      // this.crt.write("\r\n");
      // if (this.shell.showPrompt) this.shell.showPrompt();
      this.crt.write(completion);
      return;
    }
    this.lastCmd = this.buf.trim();
    this.clearBuf();
    this.crt.write("\r\n");
    if (this.findHistory(this.lastCmd) > -1) {
      this.historyIdx = this.findHistory(this.lastCmd);
      this.doReturnGetFromHistory = 1;
    }

    if (this.doReturnGetFromHistory === 1) {
      let i1 = this.historyIdx;
      let i2 = this.history.length - 1;
      this.geserDepan(this.history, i1);
    }

    if (this.shellHandler) await this.shellHandler(this.lastCmd);

    if (this.userInputCharmask !== null) {
      this.userInputCharmask = null;
    }
    this.historyIdx = this.history.length;
    this.tabSearchIdx = 0;
    this.doReturnGetFromHistory = 0;
  }

  geserDepan(a, idx) {
    let s = a[idx];
    for (let i = idx; i < a.length - 1; i++) {
      a[i] = a[i + 1];
    }
    a[a.length - 1] = s;
  }

  keyPress(ch) {
    if (this.echo) {
      this.crt.write(
        this.userInputCharmask === null ? ch : this.userInputCharmask
      );
    }

    // Tambahan: ESC untuk keluar dari mode tab completion cycling
    if (ch === "\x1B" && this.optionsState === 1) { // ESC
      // Hapus baris prompt+buffer
      this.crt.write(`\x1b[2K\r`);
      if (this.shell.showPrompt) this.shell.showPrompt();
      this.crt.write(this.buf);
      // Hapus baris opsi sebelumnya
      // this.crt.write(`\x1b[1A\x1b[2K\r`);
      this.optionsState = 0;
      this.tabTabState = null;
      return;
    }

    this.buf = this.buf.splice(this.col, 0, ch);
    if (this.col < this.buf.length - 1) {
      this.crt.write(this.buf.substring(this.col + 1));
      for (let i = this.buf.length - this.col - 1; i > 0; i--) {
        this.crt.write("\b");
      }
    }
    this.col++;
    this.tabSearchWord = this.buf.split(" ").pop();
    this.tabSearchIdx = 0;
  }

  clearBuf() {
    this.buf = "";
    this.col = 0;
    this.tabSearchWord = "";
    this.tabSearchIdx = 0;
  }

  // Metode lainnya dipertahankan sesuai dengan versi asli, namun diubah menjadi class-based
  doDelete() {
    this.buf = this.buf.split("");
    this.buf.splice(this.col, 1);
    this.buf = this.buf.join("");
    this.crt.write(this.buf.substring(this.col));
    this.crt.write("\x1b[C");
    this.crt.write("\b \b");
    //this.tabSearchWord = this.buf;
    for (let i = 0; i < this.buf.length - this.col; i++) this.crt.write("\b");

    let arr = this.buf.split(" ");
    this.tabSearchWord = arr[arr.length - 1];
  }
  doRightCursor() {
    if (this.col < this.buf.length) {
      this.crt.write("\x1b[C");
      this.col++;
    }
  }
  doLeftCursor() {
    if (this.col > 0) {
      this.crt.write("\b");
      this.col--;
    }
  }
  doBackSpace() {
    if (this.buf.length > 0) {
      if (this.col == this.buf.length) {
        if (this.userInputCharmask == "");
        else this.crt.write("\b \b");
        this.buf = this.buf.substring(0, this.buf.length - 1);
        //this.tabSearchWord = this.buf;
      } else {
        if (this.col > 0) {
          this.buf = this.buf.splice(this.col - 1, 1, "");
          if (this.userInputCharmask == "");
          else this.crt.write("\b");
          this.crt.write(this.buf.substring(this.col - 1) + " ");
          if (this.userInputCharmask == "");
          else
            for (let i = 0; i < this.buf.length - this.col + 2; i++)
              this.crt.write("\b");
        }
      }
      this.col--;
    }
    let arr = this.buf.split(" ");
    this.tabSearchWord = arr[arr.length - 1];
  }
  replaceCmd(rcmd) {
    this.hideCursor();
    if (this.buf.length > 0) {
      this.crt.write(`\x1b[${this.buf.length}D`);
      this.crt.write(`\x1b[0K`);
    }

    this.buf = rcmd;
    this.col = this.buf.length;
    this.crt.write(rcmd);
    this.showCursor();
  }

  doHome() {
    while (this.col > 0) {
      this.doLeftCursor();
    }
  }

  setBackColor(color) {
    let ansiColor;
    switch (color) {
      case "reset":
        ansiColor = 0;
        break;
      case "black":
        ansiColor = 40;
        break;
      case "red":
        ansiColor = 41;
        break;
      case "green":
        ansiColor = 42;
        break;
      case "yellow":
        ansiColor = 43;
        break;
      case "blue":
        ansiColor = 44;
        break;
      case "magenta":
        ansiColor = 45;
        break;
      case "cyan":
        ansiColor = 46;
        break;
      case "white":
        ansiColor = 47;
        break;
    }
    this.crt.write(`\x1b[${ansiColor}m`);
  }

  setTextColor(color) {
    let ansiColor;
    switch (color) {
      case "black":
        ansiColor = 30;
        break;
      case "red":
        ansiColor = 31;
        break;
      case "green":
        ansiColor = 32;
        break;
      case "yellow":
        ansiColor = 33;
        break;
      case "blue":
        ansiColor = 34;
        break;
      case "magenta":
        ansiColor = 35;
        break;
      case "cyan":
        ansiColor = 36;
        break;
      case "white":
        ansiColor = 37;
        break;
    }
    this.crt.write(`\x1b[${ansiColor}m`);
  }

  setCursor(row, col) {
    this.crt.write(`\x1b[${row};${col}H`);
  }

  clearScreen() {
    //this.crt.write("\033[2J\033[0;0f");
    this.crt.write("\x1b[2J\x1b[0;0f");
  }
  pushIOKey(io) {
    //if (typeof this.keyListener!="undefined") {
    if (this.echo == 0) {
      if (typeof this.keyListener != "undefined") this.keyListener(io);
    } else {
      let ch;
      ch = io.key.sequence;
      if ((io.key.ctrl === true && io.key.name == "u") || ch == "\x15") {
        if (this.buf.length > 0) {
          this.crt.write(`\x1b[${this.buf.length}D`);
          this.crt.write(`\x1b[0K`);

          this.clearBuf();
        }
      } else if (
        io.key.ctrl === true &&
        io.key.shift === true &&
        io.key.name == "v"
      ) {
        this.replaceCmd(cp.paste());
        //this.crt.write(cp.paste().toString());
      } else if (io.key.ctrl === true && ch == "\x03") {
        // ctrl + c
        this.doCtrlC();
      } else if (ch == "\r") {
        this.doReturn();
      } else if (ch == " ") {
        this.keyPress(" ");
      } else if (ch == "\x1B[3~") {
        this.doDelete();
      } else if (ch == "\x1B[C") {
        this.doRightCursor();
      } else if (ch == "\x1B[H") {
        // while (this.col>0) {
        //  this.doLeftCursor();
        // }
        this.doHome();
      } else if (ch == "\t") {
        // tab
        this.doTab();
      } else if (ch == "\x1B[A") {
        // up
        if (this.history.length > 0) {
          if (this.historyIdx >= 0) {
            if (this.historyIdx > 0) this.historyIdx--;
            let hcmd = this.history[this.historyIdx];

            this.replaceCmd(hcmd);
            this.buf = hcmd;
            this.col = this.buf.length;
            this.doReturnGetFromHistory = 1;
          }
        }
      } else if (ch == "\x1B[B") {
        // down
        if (this.history.length > 0) {
          if (this.historyIdx < this.history.length) {
            if (this.historyIdx < this.history.length - 1) this.historyIdx++;
            let hcmd = this.history[this.historyIdx];
            this.replaceCmd(hcmd);
            this.buf = hcmd;
            this.col = this.buf.length;
            this.doReturnGetFromHistory = 1;
          }
        }
      } else if (ch == "\x1B[F") {
        while (this.col < this.buf.length) {
          this.doRightCursor();
        }
      } else if (ch == "\x1B[D") {
        // left
        this.doLeftCursor();
      } else if (ch == "\x7F" || ch == "\b") {
        // backspace
        this.doBackSpace();
      } else if (ch == "\x1B[5~") {
        // pageup
      } else if (ch == "\x1B[6~") {
        // pagedown
      } else {
        this.keyPress(ch);
      }
    }
  }
}
module.exports = { version: "0.7", TermUtil };
