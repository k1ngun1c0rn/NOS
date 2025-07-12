module.exports = {
  instanceName: "__sysinit",
  main: async function (nos) {
    __APP.distro = {
      version: "BFS Ochroma Pyramidale v1.3",
    };
    // return;
    const path = require("path");
    nos.path = path;
    const sysConfigPath = "/opt/conf/sysconfig.js";

    nos.sysConfig = bfs.require(sysConfigPath);

    // if (nos.args[2]) nos.hostName = nos.args[2];
    // else nos.hostName = nos.sysConfig.hostName;
    const args = nos.args;
    const hostnameIndex = args.indexOf("-h");
    nos.hostName = hostnameIndex !== -1 && args[hostnameIndex + 1] ? args[hostnameIndex + 1] : nos.sysConfig.hostName;

    const __nimbusDriver = bfs.require("/dev/nimbus.js");
    const nimbusDriver = new __nimbusDriver.NOSInternalMessageBus();
    nos.mountDevice(nimbusDriver);

    const { DisplayDriver } = bfs.require("/dev/display");
    const crt = new DisplayDriver(nos);
    nos.mountDevice(crt);

    const { KeyboardDriver } = bfs.require("/dev/keyboard");
    const keyboardDriver = new KeyboardDriver(nos);
    nos.mountDevice(keyboardDriver);

    __APP.distro.version = bfs.fileSystemDriver.name + " " + __APP.distro.version;

    // const FileDriver = bfs.require("/dev/bfs");
    const FileDriver = bfs.require(`/dev/${bfs.fileSystemDriver.lib}`);
    const fileDriver = new FileDriver.NOSFileSystemDriver();
    nos.mountDevice(fileDriver);

    // create global variable for accessing bfs
    fs = fileDriver;
    fileDriver.instanceCopy(bfs)


    bfs.readFileSync = fileDriver.readFileSync.bind(fileDriver);
    /* * * * * * * * * * * * * * * * * * * * * * * */
    const SyslogDriver = bfs.require("/dev/syslog");
    const syslogDriver = new SyslogDriver.sysloggerInit(
      nos,
      "/opt/syslog.txt",
    );
    nos.mountDevice(syslogDriver);

    let display = nos.getDevice("display");
    let keyboard = nos.getDevice("keyboard");

    const { Terminal } = bfs.require("/base/terminal");
    const terminal = new Terminal("tty", display, keyboard);

    __APP.shell = {
      manager: nos.sysConfig.shell.manager,
    };
    const { ShellOpen } = bfs.require("/base/shellOpen");
    //constructor(prompt = ">", title, nos, parentShell, transmitData, authentication) {

    const loginAsRoot = true;
    const mainShell = new ShellOpen(
      `%hostname:%pwd %username%roottag `,
      "Main Shell",
      nos,
      null,
      null,
      false,
    );
    // mainShell.shell.transmittActive = false; // false = disable all emitted text to active screen
    mainShell.shell.sysConfig = nos.sysConfig;
    mainShell.shell.envPath = "/base;/opt";
    mainShell.shell.syslog = nos.getDevice("syslogger");
    mainShell.shell.pwd = "/home/";
    mainShell.shell.transmitData = (data) => {
      if (mainShell.shell.transmittActive) {
        terminal.crt.write(data);
      }
    };

    terminal.kbEvent = (io) => {
      mainShell.shell.pushIOKey(io);
    };

    mainShell.shell.onExit = () => {
      nos.shutdown(0);
    };
    mainShell.shell.term.autoCompletionList =
      mainShell.shell.term.autoCompletionList.concat([nos.hostName]);

    let dirContents = fileDriver.getDirectoryContents("/");
    mainShell.shell.term.autoCompletionList =
      mainShell.shell.term.autoCompletionList.concat(dirContents);

    dirContents = fileDriver.getDirectoryContents("/base");
    mainShell.shell.term.autoCompletionList =
      mainShell.shell.term.autoCompletionList.concat(dirContents);

    dirContents = fileDriver.getDirectoryContents("/opt");
    mainShell.shell.term.autoCompletionList =
      mainShell.shell.term.autoCompletionList.concat(dirContents);

    if (!__APP.core) __APP.core = {};

    try {
      const startUp = bfs.require(`/opt/conf/startup.js`);
      startUp.startUp(nos);
    } catch (e) {
      console.error(e);
    }

    await fileDriver.readFile(`/opt/conf/startup.sh`, async (err, content) => {
      try {
        mainShell.shell.rootActive = true;
        await content.split("\n").map(async (x) => {
          if (x.trim() != "" && x[0] != "#") {
            let arrX = x.split(" ");
            mainShell.shell.lastCmd = x;
            await mainShell.shell.termUtil.shellHandler(x);
          }
          mainShell.shell.transmittActive = false;
          await mainShell.shell.termUtil.shellHandler("cd /home");
          mainShell.shell.transmittActive = true;
        });
        if (nos.sysConfig.shell.needLogin == 1)
          await mainShell.shell.termUtil.shellHandler("login");
        else {
          mainShell.shell.username = "root";
          mainShell.shell.rootActive = true;
          mainShell.shell.greeting(() => {
            mainShell.shell.transmittActive = true;
          });
        }
      } catch (e) {
        console.error("Error executing startup script:", e);
      }
      // bfs = fs;
    });
  },
};
