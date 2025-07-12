module.exports = {
  instanceName: "atto",
  name: "atto",
  version: 0.24,
  main: function (nos) {
    // Memuat fileDriver sebagai device
    const devices = [{ name: "bfsAccess", objectName: "fd" }];
    this.shell.loadDevices(devices, this);
    this.display = this.shell.crt;

    // Parsing command-line arguments
    const args = this.shell.parseCommand(this.shell.lastCmd);

    const showSyntax = () => {
      this.display.textOut(`atto, a simple text editor.\n`);
      this.display.textOut(`Syntax: ${args.command} <filename>`);
      this.shell.terminate();
    };

    if (!args.params._) {
      showSyntax();
      return;
    }

    const filename = this.shell.pwd + args.params._[0];
    try {
      let content = this.fd.readFileSync(filename);
      // this.display.textOut("Content: "+content);
      content = content.replaceAll("\t", "  ");
      const { SimpleTextEditor } = bfs.require("/lib/texteditor");
      this.display.rows = this.shell.crt.rows;
      this.display.columns = this.shell.crt.columns;
      let myeditor = new SimpleTextEditor(content, this.display);
      myeditor.onExit = () => {
        this.shell.keyboardActive = true;
        this.shell.terminate();
        this.shell.getKey = null;
        myeditor = null;
      };
      myeditor.saveAndExit = () => {
        let content = myeditor.lines.join("\n");
        this.fd.writeFileSync(filename, content);
        this.display.clear();
        myeditor.stdout.write("File saved. Exiting...\n");
      };
      myeditor.save = () => {
        let content = myeditor.lines.join("\n");
        this.fd.writeFileSync(filename, content);
        this.display.write(`\x1b[${this.display.rows};1H\x1b[2K`);
        this.display.write(`** File saved to ${filename}`);
      };
      myeditor.discard = () => {
        this.display.clear();
        if (myeditor.changed == true)
          myeditor.stdout.write("Exiting without save...\n");
      };
      this.shell.keyboardActive = false;
      this.shell.getKey = (io) => {
        // console.log(`|${io.key.name}|`);
        // this.display.write(io.key.sequence);
        myeditor.keyboardFeeder(null, io.key);
      };
    } catch (e) {
      this.display.textOut(e);
    }
  },
};
