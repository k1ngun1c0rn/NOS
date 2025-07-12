module.exports = {
  name: "unmountdev",
  version: 0.1,
  main: function (nos) {
    const args = this.shell.parseCommand(this.shell.lastCmd);

    const showSyntax = () => {
      this.crt.textOut(`Syntax: unmountdev <device_instance_name>`);
      this.terminate();
    };

    if (!args.params._ || args.params._.length < 1) {
      showSyntax();
      return;
    }

    const deviceInstanceName = args.params._[0];

    try {
      nos.unmountDevice(deviceInstanceName);
      this.crt.textOut(`Device '${deviceInstanceName}' unmounted.`);
    } catch (e) {
      this.crt.textOut(`Failed to unmount device: ${e.message}`);
    }

    this.terminate();
  },
};
