module.exports = {
    name: "shutdown",
    version: 0.1,
    description: "Mengaktifkan trigger shutdown untuk mematikan NOS",
    needRoot: true,

    main: function (nos) {
        nos.shutdown(0);
    },

    // 🎖️ exitSignal pakai Promise
    exitSignal: function () { }
}
