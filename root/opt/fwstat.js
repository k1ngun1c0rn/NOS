module.exports = {
  name: "fwstat",
  version: 1.4,
  description: "Menampilkan semua aturan firewall aktif dari semua device dengan format tabel",
  needRoot: true,
  main: function (nos) {
    this.display = this.shell.crt;

    const devices = nos.devices;
    const deviceNames = Object.keys(devices);
    let tableRows = [];
    let headerLine =
      "Device       | Host ID    | Status | Index | Dir.     | Type   | SrcAddr   | SrcPort | DstAddr   | DstPort | Active ";
    let dividerLine = "-".repeat(headerLine.length);

    tableRows.push("NOS fwstat - Firewall Rules (summary view):\n");
    tableRows.push(dividerLine);
    tableRows.push(headerLine);
    tableRows.push(dividerLine);

    let ruleFound = false;

    for (let i = 0; i < deviceNames.length; i++) {
      const dev = devices[deviceNames[i]];
      const devName = dev.name || deviceNames[i];  // Gunakan .name jika ada
      // const dev = devices[devName]; 
      if (
        !dev || !dev.connMgr ||
        typeof dev.connMgr !== "object" ||
        dev.connMgr.constructor.name !== "connectionManager"
      ) continue;

      const cm = dev.connMgr;
      const rules = cm.firewallRules || [];
      const status = cm.firewallActive ? "ON " : "OFF";
      const hostId = dev.hostName || "-";

      for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        const dir = rule.direction?.padEnd(8) || "-".padEnd(8);
        const type = rule.type?.padEnd(5) || "-".padEnd(5);
        const srcAddr = (rule.condition?.srcAddress || "*").padEnd(10);
        const srcPort = (rule.condition?.srcPort || "*").toString().padEnd(7);
        const dstAddr = (rule.condition?.dstAddress || "*").padEnd(10);
        const dstPort = (rule.condition?.dstPort || "*").toString().padEnd(7);
        const active = rule.active ? "Yes" : "No ";

        const row =
          `${devName.padEnd(13)}| ${hostId.padEnd(11)}| ${status.padEnd(7)}| ${i.toString().padEnd(6)}| ${dir.padEnd(9)}| ${type.padEnd(7)}| ${srcAddr.padEnd(10)}| ${srcPort.padEnd(8)}| ${dstAddr.padEnd(10)}| ${dstPort.padEnd(8)}| ${active}`;

        tableRows.push(row);
        ruleFound = true;
      }
    }

    if (!ruleFound) {
      this.display.textOut("⚠️  Tidak ada firewall rule aktif di device manapun.");
    } else {
      tableRows.push(dividerLine);
      this.display.textOut(tableRows.join("\n"));
    }

    this.shell.terminate();
  }
}
