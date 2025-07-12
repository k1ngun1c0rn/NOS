module.exports = {
  name: "reboot",
  description: "Soft reboot the NOS system",
  version: "1.0",
  needRoot: true,
  main: function (nos) {
    this.crt.textOut("🔄 Rebooting NOS...\n");
    setTimeout(() => {
      nos.shutdown(1); //errorlevel 1 untuk reboot, feeder ke bootstrap.sh
    }, 500); // beri delay sedikit biar pesan tampil
  }
};
