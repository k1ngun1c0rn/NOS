module.exports = {
    name: "kill",
    version: 0.1,
    description: "Mematikan aplikasi berdasarkan PID",
    needRoot: true,
    main: function (nos) {
        this.display = this.shell.crt;
        const args = this.shell.parseCommand(this.shell.lastCmd);
        const pid = parseInt(args.rawArgs[0]);

        if (!pid || isNaN(pid)) {
            this.display.textOut("Usage: kill <pid>");
            return this.shell.terminate();
        }

        const index = nos.runApps.findIndex(app => app.pid === pid);
        if (index === -1) {
            this.display.textOut(`❌ PID ${pid} not found!`);
            return this.shell.terminate();
        }

        const target = nos.runApps[index];

        this.display.textOut(`🛑 Kill ${target.instance?.name || target.filename} (PID ${pid})...`);

        try {
            if (typeof target.instance?.exitSignal === "function") {
                target.instance.exitSignal();
            }
        } catch (err) {
            this.display.textOut("❌ Terjadi error saat terminate: " + err.message);
        }

        // Cleanup paksa dari daftar aplikasi
        nos.runApps.splice(index, 1);

        this.shell.terminate();
    }
}
