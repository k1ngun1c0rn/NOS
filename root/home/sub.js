module.exports = {
  name: "sub",
  description: "Subscriber test untuk Nimbus",
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
    // Simpan fungsi unsubscribe di 'this'
    this.unsubscribeNimbus = null;

    this.crt.textOut(`👂 Subscriber dimulai. Mendengarkan topik "${topic}"...\n`);
    this.crt.textOut("Tekan Ctrl+C untuk berhenti.\n");

    this.unsubscribeNimbus = this.nimbus.subscribe(topic, (data) => {
      this.crt.textOut(`[SUB] Menerima pesan: ${JSON.stringify(data)}`);
    });

    if (!this.unsubscribeNimbus || typeof this.unsubscribeNimbus !== 'function') {
      this.crt.textOut("❌ Error: Gagal subscribe ke Nimbus atau fungsi unsubscribe tidak valid.\n");
      // Mungkin terminate di sini jika subscribe gagal total
      this.shell.terminate();
      return;
    }

    // Daftarkan cleanup logic ke interruptSignalListener
    this.shell.interruptSignalListener.push(() => {
      if (this.unsubscribeNimbus && typeof this.unsubscribeNimbus === 'function') {
        this.unsubscribeNimbus();
        this.unsubscribeNimbus = null; // Tandai sudah di-unsubscribe
        if (this.crt) this.crt.textOut("\n[SUB] Subscriber dihentikan dan unsubscribe berhasil via sinyal interupsi.\n");
      }
    });
  }
};