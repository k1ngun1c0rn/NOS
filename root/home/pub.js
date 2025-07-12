module.exports = {
  name: "pub",
  description: "Publisher test untuk Nimbus",
  version: "1.0",
  needRoot: false,
  main: function (nos) {
    const devices = [
      { name: "nimbus", objectName: "nimbus" },
      { name: "display", objectName: "crt" },
    ];
    this.shell.loadDevices(devices, this);

    if (!this.nimbus) {
      this.crt.textOut("❌ Error: Device Nimbus tidak ditemukan.\n");
      this.shell.terminate();
      return;
    }

    const topic = "nimbus.test.topic";
    let counter = 0;
    // Simpan intervalId di dalam 'this' agar bisa diakses oleh listener interupsi
    this.intervalId = null;

    this.crt.textOut(`🚀 Publisher dimulai. Mengirim pesan ke topik "${topic}" setiap detik...\n`);
    this.crt.textOut("Tekan Ctrl+C untuk berhenti.\n");

    this.intervalId = setInterval(() => {
      counter++;
      const timestamp = Date.now();
      const message = {
        text: `Hello World #${counter}`,
        timestamp: timestamp,
        from: "pub.js"
      };

      // this.crt.textOut(`[PUB] Mengirim: ${JSON.stringify(message)}`);
      this.nimbus.publish(topic, message);
    }, 1000);

    // Daftarkan cleanup logic ke interruptSignalListener
    this.shell.interruptSignalListener.push(() => {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null; // Tandai sudah di-clear
        // Pesan ini mungkin tidak akan terlihat jika shell langsung terminate setelah interrupt
        // Tapi baik untuk ada jika ada delay atau logging tambahan
        if (this.crt) this.crt.textOut("[PUB] Publisher dihentikan oleh sinyal interupsi.");
      }
      // Shell akan menangani terminasi setelah semua listener interupsi dijalankan
    });
  }
  // exitSignal tidak lagi terlalu krusial jika interruptSignalListener menangani cleanup
};