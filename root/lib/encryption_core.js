class EncryptionCore {
  constructor() {
    this.version = "0.08";
    this.encryptions = [];
    this.defaultEncryption = null;
    this.instances = {}; // centralized agent instances
  }

  registerEncryption(agentOrClass) {
    if (typeof agentOrClass === "function") {
      this.encryptions.push(agentOrClass); // Register class
      // console.log(`✅ Registered agent class: ${agentOrClass.name}`);
    } else if (typeof agentOrClass === "object" && agentOrClass.name) {
      this.encryptions.push(() => agentOrClass); // Legacy
      // console.log(`✅ Registered legacy agent: ${agentOrClass.name}`);
    } else {
      console.error("❌ Invalid agent format");
    }
  }

  getEncryption(encryptionName) {
    return this.encryptions.find((factory) => {
      const agent = typeof factory === "function" ? factory : () => factory;
      return (
        factory.name === encryptionName ||
        factory?.prototype?.name === encryptionName ||
        factory.constructor?.name === encryptionName
      );
    });
  }

  newInstance(encryptionName, key) {
    const AgentClass = this.getEncryption(encryptionName);
    if (!AgentClass) throw new Error("Agent not found: " + encryptionName);
    return new AgentClass(key);
  }

  addInstance(agentName, encryptionName, key = "") {
    if (this.instances[agentName]) {
      return this.instances[agentName];
      //throw new Error(`Instance for '${agentName}' already exists.`);
    }
    const instance = this.newInstance(encryptionName, key);
    instance.agentName = agentName;
    this.instances[agentName] = instance;
    return instance;
  }

  renameInstance(oldName, newName) {
    if (!this.instances[oldName]) {
      throw new Error(`❌ Agent '${oldName}' tidak ditemukan`);
    }
    if (this.instances[newName]) {
      throw new Error(`❌ Agent '${newName}' sudah ada`);
    }

    const instance = this.instances[oldName];
    delete this.instances[oldName];
    instance.agentName = newName;
    this.instances[newName] = instance;

    return instance;
  }


  getInstance(agentName) {
    return this.instances[agentName] || null;
  }

  setSecurityAgent(device, agentName) {
    // const device = nos.devices[deviceName];
    const instance = this.getInstance(agentName);
    if (!instance)
      throw new Error("Encryption instance not found: " + agentName);
    if (
      !device ||
      !device.connMgr ||
      typeof device.connMgr.setSecurityAgent !== "function"
    ) {
      throw new Error(
        `Device '${device.name}' invalid or not supporting setSecurityAgent()`
      );
    }
    const secured = new device.mqtnl.securityAgent(
      instance.cipher.bind(instance),
      instance.decipher.bind(instance)
    );
    device.connMgr.setSecurityAgent(secured);
    device.connMgr.activeSecurityAgentName = agentName;
  }

  setSecurityAgentByConnMgr(connMgr, agentName) {
    // const device = nos.devices[deviceName];
    const mqtnlLib = bfs.require("/lib/mqttNetworkLib.js");
    const instance = this.getInstance(agentName);
    if (!instance)
      throw new Error("Encryption instance not found: " + agentName);
    if (!connMgr || typeof connMgr.setSecurityAgent !== "function") {
      throw new Error(
        `Device '${connMgr.id}' invalid or not supporting setSecurityAgent()`
      );
    }
    const secured = new mqtnlLib.securityAgent(
      instance.cipher.bind(instance),
      instance.decipher.bind(instance)
    );
    connMgr.setSecurityAgent(secured);
    connMgr.activeSecurityAgentName = agentName;
  }
}

module.exports = EncryptionCore;
