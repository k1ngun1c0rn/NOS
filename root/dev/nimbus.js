// file: /home/bfsnos/root/nos/NOSMessageBus.js (atau path yang sesuai)

class NOSInternalMessageBus {
  constructor() {
    this.topics = {}; // Objek untuk menyimpan topik dan subscriber-nya
    // Contoh: { 'file.changed': [callback1, callback2], 'user.login': [callback3] }
    this.name = "nimbus"; // Nama driver baru
    this.devClass = "NOS Internal Message Bus"; // Kelas driver
    this.version = 1.0;
    this.crt = null; // Opsional, untuk logging jika diperlukan
  }

  setCrt(crt) {
    this.crt = crt;
  }

  /**
   * Mendaftarkan callback untuk sebuah topik.
   * @param {string} topic Nama topik yang ingin di-subscribe.
   * @param {function} callback Fungsi yang akan dipanggil ketika ada pesan di topik tersebut.
   * @returns {function} Fungsi untuk unsubscribe.
   */
  subscribe(topic, callback) {
    if (typeof callback !== 'function') {
      if (this.crt) this.crt.textOut(`[NOSMessageBus] Error: Callback untuk topik "${topic}" bukan fungsi.\n`);
      console.error(`[NOSMessageBus] Error: Callback untuk topik "${topic}" bukan fungsi.`);
      return () => { }; // Kembalikan fungsi no-op untuk unsubscribe
    }

    if (!this.topics[topic]) {
      this.topics[topic] = [];
    }
    this.topics[topic].push(callback);

    if (this.crt) this.crt.textOut(`[NOSMessageBus] Subscriber baru untuk topik "${topic}".\n`);

    // Kembalikan fungsi untuk unsubscribe
    return () => {
      this.unsubscribe(topic, callback);
    };
  }

  /**
   * Menghapus pendaftaran callback dari sebuah topik.
   * @param {string} topic Nama topik.
   * @param {function} callback Fungsi callback yang ingin di-unsubscribe.
   */
  unsubscribe(topic, callback) {
    if (!this.topics[topic]) {
      return;
    }

    this.topics[topic] = this.topics[topic].filter(cb => cb !== callback);

    if (this.topics[topic].length === 0) {
      delete this.topics[topic]; // Hapus topik jika tidak ada subscriber lagi
    }
    if (this.crt) this.crt.textOut(`[NOSMessageBus] Subscriber dihapus dari topik "${topic}".\n`);
  }

  /**
   * Menerbitkan pesan ke sebuah topik. Semua subscriber topik tersebut akan dipanggil.
   * @param {string} topic Nama topik.
   * @param {any} data Data atau pesan yang ingin dikirim.
   */
  publish(topic, data) {
    if (!this.topics[topic]) {
      if (this.crt) this.crt.textOut(`[NOSMessageBus] Tidak ada subscriber untuk topik "${topic}", pesan tidak dikirim.\n`);
      return; // Tidak ada subscriber untuk topik ini
    }

    if (this.crt) this.crt.textOut(`[NOSMessageBus] Menerbitkan pesan ke topik "${topic}" dengan data: ${JSON.stringify(data)}\n`);

    // Panggil setiap callback subscriber secara asinkron agar tidak memblok
    // Jika ada error di satu subscriber, tidak mengganggu yang lain
    this.topics[topic].forEach(callback => {
      setTimeout(() => {
        try {
          callback(data);
        } catch (error) {
          if (this.crt) this.crt.textOut(`[NOSMessageBus] Error pada subscriber topik "${topic}": ${error.message}\n`);
          console.error(`[NOSMessageBus] Error pada subscriber topik "${topic}":`, error);
        }
      }, 0);
    });
  }

  /**
   * (Opsional) Mendapatkan daftar topik yang aktif.
   * @returns {string[]} Array nama topik.
   */
  getActiveTopics() {
    return Object.keys(this.topics);
  }
}

module.exports = { NOSInternalMessageBus };