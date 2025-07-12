module.exports = {
  name: "Nano CPU monitor",
  version: "1.6",
  author: "Canding & ChatGPT",
  description: "Nano live CPU monitor",
  main: function (os) {
    this.crt = this.shell.crt;
    const crt = this.crt;
    const refreshMs = 1000;
    const linesUsed = 9; // baris output yang akan ditimpa tiap kali

    let lastCpu = process.cpuUsage();
    let lastTime = process.hrtime();

    let first = 1;
    const draw = () => {
      const nowCpu = process.cpuUsage(lastCpu);
      const nowTime = process.hrtime(lastTime);

      const elapsedMs = nowTime[0] * 1000 + nowTime[1] / 1e6;
      const userMs = nowCpu.user / 1000;
      const systemMs = nowCpu.system / 1000;
      const totalCpuMs = userMs + systemMs;
      const cpuPercent = (totalCpuMs / elapsedMs) * 100;

      // Simpan untuk perbandingan di next loop
      lastCpu = process.cpuUsage();
      lastTime = process.hrtime();

      if (first == 0) {
        // Gerakkan cursor ke atas & hapus baris sebelumnya
        for (let i = 0; i < linesUsed; i++) {
          crt.write(`\x1b[1A\x1b[2K`);
        }
      }

      // Tampilkan ulang
      crt.textOut(`\n🖥️  CPU Usage Live (every ${refreshMs}ms)`);
      crt.textOut(`-----------------------------`);
      crt.textOut(`User Time   : ${userMs.toFixed(2)} ms`);
      crt.textOut(`System Time : ${systemMs.toFixed(2)} ms`);
      crt.textOut(`Total       : ${totalCpuMs.toFixed(2)} ms`);
      crt.textOut(`-----------------------------`);
      crt.textOut(`CPU Usage   : ${cpuPercent.toFixed(2)}%`);
      crt.textOut(`Press Control + C to exit`);

      if (first == 1) first = 0;
    };

    draw();
    const loop = setInterval(draw, refreshMs);

    // Tangani Ctrl+C (interrupt)
    this.shell.interruptSignalListener.push(() => {
      clearInterval(loop);
      this.terminate();
    });
    this.exitSignal = () => {
      clearInterval(loop);
      this.terminate();
    };
  },
};
