module.exports = {
  name: "history",
  version: "1.2",
  author: "Canding & ChatGPT",
  description:
    "Menampilkan dan menjalankan ulang history shell dari /home/cmdHist.txt via fileAccess device.",
  main: function (nos) {
    this.crt = this.shell.crt;

    // Load device fileAccess dengan alias 'fa'
    const devices = [{ name: "bfsAccess", objectName: "fa" }];
    this.shell.loadDevices(devices, this);

    const crt = this.crt;
    const fa = this.fa;
    const histFile = "/home/cmdHist.txt";

    // Fungsi tampilkan history
    this.showHistory = () => {
      if (!fa.fileExistsSync(histFile)) {
        crt.textOut("⛔ File history tidak ditemukan.\n");
        return;
      }

      const content = fa.readFileSync(histFile);
      const lines = content.split("\n").filter((x) => x.trim() !== "");
      if (lines.length === 0) {
        crt.textOut("📭 History kosong.\n");
        return;
      }

      lines.forEach((line, i) => {
        crt.textOut(`${i + 1}. ${line}`);
      });

      this.lastLines = lines;
    };

    // Eksekusi awal
    this.showHistory();
    this.shell.terminate();
  },

  exitSignal: function () {
    // Tidak perlu cleanup
  },
};
