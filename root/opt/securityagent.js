module.exports = {
  instanceName: "secagentctl",
  name: "Security Agent Controller",
  version: "1.5",
  needRoot: false,
  main: function (nos) {
    this.display = this.shell.crt;

    const rawCmd = this.shell.lastCmd;
    const keys = Object.keys(this.shell.parseCommand(rawCmd).params);
    const match = rawCmd.match(/set\s+(\S+)\s+to\s+(\S+)/i);
    const core_encryption = __APP.core.encryption;

    if (keys.includes("-list")) {
      const classes = core_encryption.encryptions;
      const instances = core_encryption.instances;
      this.display.textOut("");
      let i = 0;
      for (let cls of classes) {
        const name = cls.name || "Unknown";
        const desc = cls.description || "─";

        this.display.textOut(`${name}`);
        // this.display.textOut(` |`);

        // Ambil semua instance yang matching dengan nama class ini
        const matchingInstances = Object.values(instances).filter(
          (inst) => inst.name === name
        );
        if (i == classes.length - 1) endSquare = `└`;
        else endSquare = `├`;
        if (matchingInstances.length === 0) {
          this.display.textOut(
            ` ${endSquare}────────────────────── No Instances`
          );
        } else {
          for (let inst of matchingInstances) {
            this.display.textOut(
              ` ${endSquare}────────────────────── ${inst.agentName}`
            );
          }
        }
        i++;
      }
      this.display.textOut(``);
      this.shell.terminate();
      return;
    }

    if (!match) {
      this.display.textOut(
        "Usage: securityagent set <deviceName> to <agentName>"
      );
      this.shell.terminate();
      return;
    }

    const targetDevice = match[1];
    const agentName = match[2];

    //const dev = nos.devices[targetDevice];
    const dev = nos.getDevice(targetDevice);
    if (!dev) {
      this.display.textOut(`❌ Device '${targetDevice}' tidak ditemukan.`);
      this.shell.terminate();
      return;
    }

    const agentClass = core_encryption.encryptions.find(
      (enc) => enc.name === agentName || enc?.prototype?.name === agentName
    );

    if (!agentClass) {
      this.display.textOut("❌ Agent not found: " + agentName);
      this.shell.terminate();
      return;
    }

    let instance;
    try {
      instance = new agentClass();
    } catch (e) {
      this.display.textOut("❌ Failed to instantiate agent: " + e.message);
      this.shell.terminate();
      return;
    }

    // Wrap agent with securityAgent if device has mqtnl adapter
    let securedAgent;
    if (dev.mqtnl?.securityAgent) {
      securedAgent = new dev.mqtnl.securityAgent(
        instance.cipher.bind(instance),
        instance.decipher.bind(instance)
      );
    } else {
      this.display.textOut(
        `❌ Device '${targetDevice}' tidak memiliki adapter 'mqtnl.securityAgent'.`
      );
      this.shell.terminate();
      return;
    }

    if (!dev.connMgr || typeof dev.connMgr.setSecurityAgent !== "function") {
      this.display.textOut(
        `❌ Device '${targetDevice}' tidak memiliki connMgr.setSecurityAgent().`
      );
      this.shell.terminate();
      return;
    }

    dev.connMgr.setSecurityAgent(securedAgent);
    this.display.textOut(`✅ ${targetDevice} now protected by ${agentName}`);
    this.shell.terminate();
  },
};
