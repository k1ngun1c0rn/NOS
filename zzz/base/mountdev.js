module.exports = {
  name: "mountdev",
  version: 0.2,
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);

    const showSyntax = () => {
      this.crt.textOut(
        `Syntax: mountdev <device_module_path> <class_name|-> <device_instance_name> [arg1] [arg2] ...`
      );
      this.terminate();
    };

    if (!args.params._ || args.params._.length < 3) {
      showSyntax();
      return;
    }

    const deviceModulePath = args.params._[0];
    const className = args.params._[1];
    const deviceInstanceName = args.params._[2];
    const ctorArgs = args.params._.slice(3); // argumen tambahan

    try {
      const DeviceModule = bfs.require(deviceModulePath);
      let device;
      if (className === "-") {
        // Default export (langsung new dari require)
        device =
          typeof DeviceModule === "function"
            ? new DeviceModule(nos, ...ctorArgs)
            : new DeviceModule.Device(nos, ...ctorArgs);
      } else {
        // Pilih property/class tertentu
        if (!DeviceModule[className])
          throw new Error(`Class '${className}' not found in module`);
        device = new DeviceModule[className](nos, ...ctorArgs);
      }
      device.name = deviceInstanceName;
      nos.mountDevice(device);
      this.crt.textOut(
        `Device '${deviceInstanceName}' mounted from '${deviceModulePath}' (${className}).`
      );
    } catch (e) {
      this.crt.textOut(`Failed to mount device: ${e.message}`);
    }
    this.terminate();
  },
};
