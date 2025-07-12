module.exports = {
  name: "firewall config",
  version: 0.4,
  main: function (os) {
    const args = this.shell.parseCommand(this.shell.lastCmd);
    const keys = Object.keys(args.params);
    let commSelected = __APP.defaultComm;
    if (keys.includes("d")) {
      commSelected = args.params.d;
    }

    // Inisialisasi objek yang dibutuhkan
    const devices = [
      { name: commSelected, objectName: "mqtnl" },
      { name: "bfsAccess", objectName: "fa" },
    ];
    this.shell.loadDevices(devices, this);
    this.display = this.shell.crt;

    const firewall = new this.mqtnl.mqtnl.firewallManager();
    firewall.firewallConfig = this.mqtnl.connMgr.firewallRules;
    // this.mqtnl.connMgr.setFirewallActive(1); 

    // Parsing argumen dari command

    // Fungsi untuk menampilkan syntax jika parameter tidak lengkap
    this.showSyntax = () => {
      this.display.textOut(
        `Syntax: ${args.command}\n` +
        `  --add -d <direction> -t <type> -c <condition> -a <active>\n` +
        `       Add (direction: incoming/outgoing, type: allow/deny, active: 1/0)\n` +
        `       Condition format: <dstAddress>,<dstPort>,<srcAddress>,<srcPort>\n` +
        `  --remove -i <index>\n` +
        `       Remove a rule by index\n` +
        `  --update -i <index> -d <direction> -t <type> -c <condition> -a <active>\n` +
        `       Update (direction: incoming/outgoing, type: allow/deny, active: 1/0)\n` +
        `       Condition format: <dstAddress>,<dstPort>,<srcAddress>,<srcPort>\n` +
        `  --list                   : Display current firewall rules\n` +
        `  --status                 : Status the firewall\n` +
        `  --enable                 : Enable the firewall\n` +
        `  --disable                : Disable the firewall`
      );
      this.shell.terminate();
    };

    // Memeriksa parameter
    if (keys.includes("-reset")) {
      // Default rules
      const defaultRules = [
        {
          direction: "incoming",
          type: "allow",
          active: 1,
          condition: {
            dstAddress: "*",
            dstPort: "*",
            srcAddress: "*",
            srcPort: "*",
          },
        },
        {
          direction: "outgoing",
          type: "allow",
          active: 1,
          condition: {
            dstAddress: "*",
            dstPort: "*",
            srcAddress: "*",
            srcPort: "*",
          },
        },
      ];

      // Terapkan ke connMgr
      this.mqtnl.connMgr.setFirewallRules(defaultRules);
      this.mqtnl.connMgr.setFirewallActive(0);

      this.display.textOut(
        `♻️ Firewall for '${commSelected}' reset to default rules (firewall is disabled).`
      );
      this.shell.terminate();
    } else if (keys.includes("-save")) {
      const configPath = "/opt/conf/fwconfig.json";
      let allConfig = [];

      // Coba baca dulu file yang sudah ada
      try {
        const content = this.fa.readFileSync(configPath);
        allConfig = JSON.parse(content);
      } catch (e) {
        allConfig = []; // File tidak ada atau rusak, kita overwrite saja
      }

      // Hapus entri lama untuk device ini (commSelected)
      allConfig = allConfig.filter((item) => item.device !== commSelected);

      // Tambahkan entri baru
      allConfig.push({
        device: commSelected,
        active: this.mqtnl.connMgr.firewallActive === 1,
        rules: this.mqtnl.connMgr.firewallRules,
      });

      // Simpan kembali ke file
      this.fa.writeFileSync(configPath, JSON.stringify(allConfig, null, 2));
      this.display.textOut(`✅ Firewall config for '${commSelected}' saved.`);
      this.shell.terminate();
    } else if (keys.includes("-load")) {
      const configPath = "/opt/conf/fwconfig.json";
      let allConfig = [];

      try {
        const content = this.fa.readFileSync(configPath);
        allConfig = JSON.parse(content);
      } catch (e) {
        return;
      }

      // Cari konfigurasi untuk commSelected
      const selected = allConfig.find((item) => item.device === commSelected);

      if (!selected) {
        this.display.textOut(
          `❌ Tidak ditemukan konfigurasi untuk device '${commSelected}'.`
        );
        // this.shell.terminate();
        return;
      }

      // Terapkan ke connMgr
      this.mqtnl.connMgr.setFirewallRules(selected.rules || []);
      this.mqtnl.connMgr.setFirewallActive(selected.active ? 1 : 0);
      // this.display.textOut(`✅ Firewall config for '${commSelected}' loaded.`);
      // this.shell.terminate();
    } else if (keys.includes("-list")) {
      // Menampilkan aturan firewall saat ini dalam format tabel yang lebih mudah dibaca
      const firewallRules = this.mqtnl.connMgr.firewallRules;

      // this.crt.textOut(JSON.stringify(firewallRules));
      // return;

      if (firewallRules.length === 0) {
        this.display.textOut("No firewall rules configured.");
      } else {
        // Header tabel
        let ruleText = "";
        ruleText +=
          `Device Comm: ${commSelected}\n` +
          "-----------------------------------------------------------------------\n";
        ruleText +=
          "Index | Direction | Type  | Source  | Src.  | Dst.    | Dst.  | Active \n";
        ruleText +=
          "      |           |       | Address | Port  | Address | Port  |        \n";
        ruleText +=
          "------+-----------+-------+---------+-------+---------+-------+--------\n";
        // Menambahkan data aturan ke dalam tabel
        firewallRules.forEach((rule, index) => {
          const srcAddress = rule.condition.srcAddress.padEnd(8, " "); // padding agar lebar kolom konsisten
          const srcPort = (
            rule.condition.srcPort === "*" ? "*" : rule.condition.srcPort
          )
            .toString()
            .padEnd(6, " ");
          const dstAddress = rule.condition.dstAddress.padEnd(8, " ");
          const dstPort = (
            rule.condition.dstPort === "*" ? "*" : rule.condition.dstPort
          )
            .toString()
            .padEnd(6, " ");
          const active = (rule.active === 1 ? "Yes" : "No").padEnd(8, " ");

          ruleText +=
            `  ${String(index).padEnd(4, " ")}| ${rule.direction.padEnd(
              10,
              " "
            )}| ${rule.type.padEnd(6, " ")}| ` +
            `${srcAddress}| ${srcPort}| ${dstAddress}| ${dstPort}| ${active}\n`;
        });

        ruleText +=
          "-----------------------------------------------------------------------\n";
        ruleText += `Firewall status: ${this.mqtnl.connMgr.firewallActive == 1 ? "active" : "inactive"
          }\n`;
        this.display.textOut(ruleText);
      }

      this.shell.terminate();
    } else if (
      keys.includes("-add") &&
      keys.includes("c") &&
      keys.includes("t") &&
      keys.includes("d") &&
      keys.includes("a")
    ) {
      // Menambahkan aturan
      const direction = args.params.d; // incoming/outgoing
      const type = args.params.t; // allow/deny
      const conditionStr = args.params.c; // dstAddress=*,dstPort=*,srcAddress=*,srcPort=*
      const active = parseInt(args.params.a);

      const condition = {};
      // conditionStr.split(",").forEach(pair => {
      //   const [key, value] = pair.split("=");
      //   condition[key] = (!isNaN(value)?parseInt(value):value);
      // });
      // Memisahkan berdasarkan koma dan memetakan ke kondisi
      const conditionArray = conditionStr.split(",");
      condition.srcAddress =
        conditionArray[0] === "*" ? "*" : conditionArray[0];
      condition.srcPort =
        conditionArray[1] === "*"
          ? "*"
          : isNaN(conditionArray[1])
            ? conditionArray[1]
            : parseInt(conditionArray[1]);
      condition.dstAddress =
        conditionArray[2] === "*" ? "*" : conditionArray[2];
      condition.dstPort =
        conditionArray[3] === "*"
          ? "*"
          : isNaN(conditionArray[3])
            ? conditionArray[3]
            : parseInt(conditionArray[3]);

      if (!["incoming", "outgoing"].includes(direction)) {
        this.display.textOut(
          `Error: Invalid direction "${direction}". Use "incoming" or "outgoing".`
        );
        this.showSyntax();
        return;
      }

      if (!["allow", "deny"].includes(type)) {
        this.display.textOut(
          `Error: Invalid type "${type}". Use "allow" or "deny".`
        );
        this.showSyntax();
        return;
      }

      // Memasukkan direction ke dalam rule
      const rule = { direction, type, active, condition };
      firewall.addRule(rule);

      // this.display.textOut(`Rule added: { direction: "${direction}", type: "${type}", active: ${active}, condition: ${JSON.stringify(condition)} }`);
      this.mqtnl.connMgr.setFirewallRules(firewall.firewallConfig);
      this.shell.terminate();
    } else if (keys.includes("-remove") && keys.includes("i")) {
      // Menghapus aturan berdasarkan index
      const index = parseInt(args.params.i);

      if (
        isNaN(index) ||
        index < 0 ||
        index >= firewall.firewallConfig.length
      ) {
        this.display.textOut(`Error: Invalid index "${args.params.i}".`);
        this.showSyntax();
        return;
      }

      firewall.removeRule(index);

      // this.display.textOut(`Rule removed at index: ${index}`);
      this.mqtnl.connMgr.setFirewallRules(firewall.firewallConfig);
      this.shell.terminate();
    } else if (
      keys.includes("-update") &&
      keys.includes("i") &&
      keys.includes("d") &&
      keys.includes("c") &&
      keys.includes("t") &&
      keys.includes("a")
    ) {
      // Mengubah aturan berdasarkan index, direction, type, dan condition
      const index = parseInt(args.params.i); // Index aturan yang akan diubah
      const direction = args.params.d; // incoming/outgoing
      const type = args.params.t; // allow/deny
      const active = parseInt(args.params.a); // allow/deny
      const conditionStr = args.params.c; // dstAddress=*,dstPort=*,srcAddress=*,srcPort=*

      const condition = {};
      // conditionStr.split(",").forEach(pair => {
      //   const [key, value] = pair.split("=");
      //   condition[key] = (!isNaN(value)?parseInt(value):value);
      // });
      const conditionArray = conditionStr.split(",");
      condition.srcAddress =
        conditionArray[0] === "*" ? "*" : conditionArray[0];
      condition.srcPort =
        conditionArray[1] === "*"
          ? "*"
          : isNaN(conditionArray[1])
            ? conditionArray[1]
            : parseInt(conditionArray[1]);
      condition.dstAddress =
        conditionArray[2] === "*" ? "*" : conditionArray[2];
      condition.dstPort =
        conditionArray[3] === "*"
          ? "*"
          : isNaN(conditionArray[3])
            ? conditionArray[3]
            : parseInt(conditionArray[3]);

      if (
        isNaN(index) ||
        index < 0 ||
        index >= firewall.firewallConfig.length
      ) {
        this.display.textOut(`Error: Invalid index "${args.params.i}".`);
        this.showSyntax();
        return;
      }

      if (!["incoming", "outgoing"].includes(direction)) {
        this.display.textOut(
          `Error: Invalid direction "${direction}". Use "incoming" or "outgoing".`
        );
        this.showSyntax();
        return;
      }

      if (!["allow", "deny"].includes(type)) {
        this.display.textOut(
          `Error: Invalid type "${type}". Use "allow" or "deny".`
        );
        this.showSyntax();
        return;
      }

      // Menyiapkan newRule dan memanggil updateRule dengan index dan newRule
      const newRule = { direction, type, active, condition };
      firewall.updateRule(index, newRule);

      // this.display.textOut(`Rule updated at index: ${index}, { direction: "${direction}", type: "${type}, active: ${active}, condition: ${JSON.stringify(condition)} }`);
      this.mqtnl.connMgr.setFirewallRules(firewall.firewallConfig);
      this.shell.terminate();
    } else if (keys.includes("-status")) {
      // Tampilkan status firewall
      this.display.textOut(
        `Firewall status: ${this.mqtnl.connMgr.firewallActive == 1 ? "active" : "inactive"
        }`
      );
      this.shell.terminate();
    } else if (keys.includes("-enable")) {
      // Mengaktifkan firewall
      this.mqtnl.connMgr.setFirewallActive(1);
      this.display.textOut("Firewall enabled.");
      this.shell.terminate();
    } else if (keys.includes("-disable")) {
      // Menonaktifkan firewall
      this.mqtnl.connMgr.setFirewallActive(0);
      this.display.textOut("Firewall disabled.");
      this.shell.terminate();
    } else {
      this.showSyntax();
    }
  },
};
