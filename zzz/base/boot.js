module.exports = {
  name: "boot",
  instanceName: "__boot",
  showBanner: () => {
    let banner = "\r\n" + "BFS NOS v1.1b \r\n" + "author: K1ngUn1c0rn🦄";
    console.log(banner);
  },

  main: async function (nos) {
    // Mengakses 'nos' yang dipassing ke dalam module
    this.showBanner(); // Menampilkan banner

    try {
      await nos.executeModule("/base/", "sysinit.js", () => { }, null, true);
    } catch (e) {
      console.log(`Error: ${e.message}`);
    }
  },
};
