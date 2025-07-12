module.exports = {
  version: "1.2",
  author: "Canding & ChatGPT",
  description: "Menampilkan statistik trafik jaringan NOS secara real-time.",
  main: async function (nos) {
    this.crt = this.shell.crt;
    const crt = this.crt;

    // Ambil semua device Connection Manager
    const devs = Object.entries(nos.devices).filter(([k, v]) =>
      v.devClass?.includes("Connection Manager")
    );

    if (devs.length === 0) {
      crt.textOut("❌ Tidak ditemukan device Connection Manager.\n");
      this.shell.terminate();
      return;
    }

    let running = true;
    const refreshInterval = 1000; // ms
    const linesUsed = devs.length + 5; // header + footer + per device

    let first = 1;
    const printStats = () => {
      if (first === 0) {
        // Hapus baris output sebelumnya
        for (let i = 0; i < linesUsed - 1; i++) {
          crt.write(`\x1b[1A\x1b[2K`);
        }
      }

      crt.textOut(`📡 NOS Network Traffic (refresh ${refreshInterval}ms)\n`);
      devs.forEach(([name, dev]) => {
        if (!dev.connMgr.getStats) {
          crt.textOut(`🔧 ${dev.name.padEnd(12)} :: [No stat support]`);
          return;
        }
        const stats = dev.connMgr.getStats?.() || {};
        const tx = stats.totalTx ?? 0;
        const rx = stats.totalRx ?? 0;
        const txKB = (tx / 1024).toFixed(2);
        const rxKB = (rx / 1024).toFixed(2);
        const txRate = stats.txKBps ?? "0.00";
        const rxRate = stats.rxKBps ?? "0.00";
        crt.textOut(
          `📡 ${dev.name.padEnd(12)} :: Tx ${txKB} KB / ${txRate} KB/s | Rx ${rxKB} KB / ${rxRate} KB/s`
        );
      });
      crt.textOut(`\nPress Ctrl+C to exit`);
      if (first === 1) first = 0;
    };

    printStats();
    const loop = setInterval(printStats, refreshInterval);

    // Tangani Ctrl+C (interrupt)
    this.shell.interruptSignalListener.push(() => {
      running = false;
      clearInterval(loop);
    });
  },

  exitSignal: function () {
    return new Promise((resolve) => resolve());
  },
};
