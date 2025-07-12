class DisplayDriver {
  constructor(os) {
    this.name = "display";
    this.os = os;
    this.devClass = "Display";
    this.version = 0.03;
    this.textOutEnable = true;
  }

  // Menulis data ke konsol
  conswrite(data) {
    process.stdout.write(data);
  }

  // Menulis data dengan newline
  conslog(data) {
    this.conswrite(`${data}\n`);
  }

  // Menampilkan teks ke layar
  textOut(str, nocrlf = false) {
    if (this.textOutEnable) {
      this.conslog(str);
    }
  }

  // Menulis data tanpa newline
  write(str) {
    if (this.textOutEnable) {
      this.conswrite(str);
    }
  }

  // Membersihkan layar
  clear() {
    if (this.textOutEnable) {
      this.write("\x1b[2J\x1b[0;0f");  // ANSI escape sequence untuk membersihkan layar
    }
  }

  // Mengaktifkan tampilan teks
  enableTextOut() {
    this.textOutEnable = true;
  }

  // Menonaktifkan tampilan teks
  disableTextOut() {
    this.textOutEnable = false;
  }

  // Mendapatkan status tampilan teks
  getTextOutState() {
    return this.textOutEnable;
  }
}

module.exports = { DisplayDriver };
