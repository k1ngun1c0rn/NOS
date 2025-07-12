class ShellOpen {
  constructor(prompt = ">", title, nos, parentShell, transmitData, authentication) {
    // const shellManager = "/base/shell";
    // const shellManager = "/base/microShell";
    const shellManager = __APP.shell.manager;
    this.prompt = prompt;
    this.title = title;
    this.transmitData = transmitData;
    if (parentShell != null) { // create shell child
      this.parentShell = parentShell;
      const { Shell } = bfs.require(shellManager);
      this.shell = new Shell(this.prompt, this.title, nos, this.transmitData, authentication);
      this.shell.parentShell = parentShell;
      parentShell.keyboardActive = false;

      this.shell.onExit = () => {
        this.parentShell.keyboardActive = true;
        this.parentShell.showPrompt();
      }
      this.shell.greeting();
    } else { // create main shell
      const { Shell } = bfs.require(shellManager);
      //(prompt = ">", title, nos, transmitData, authentication = false)
      this.shell = new Shell(this.prompt, this.title, nos, this.transmitData, authentication);
      this.shell.parentShell = null;
      this.shell.greeting();
    }
  }
}

module.exports = { ShellOpen };