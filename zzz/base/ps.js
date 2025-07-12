module.exports = {
    name: "ps",
    version: 0.1,
    description: "Menampilkan daftar aplikasi yang sedang berjalan",
    needRoot: true,
    main: function (nos) {
        this.display = this.shell.crt;

        const apps = nos.runApps;

        if (!apps || apps.length === 0) {
            this.display.textOut("Tidak ada aplikasi yang sedang berjalan.");
            return this.shell.terminate();
        }

        this.display.textOut("PID\tNAME (File)");
        this.display.textOut("──────────────────────────────");

        apps.forEach((x) => {
            const name = x.instance?.name || x.filename;
            const file = x.filename;
            this.display.textOut(`${x.pid}\t${name} (${file})`);
        });

        this.shell.terminate();
    }
}
