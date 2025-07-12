/* * * * * 
*  basicShell - A basic class shell implementation for BFS NOS
*  Version: 0.06  
*  Author: K1ngUn1c0rn
*  License: MIT
* * * * */

const { TermUtil } = bfs.require("/base/termUtil");
const path = require("path");

const { shell } = bfs.require("/opt/conf/sysconfig");
const crypto = require("crypto");

class Shell {
  #nos;

  constructor(prompt = ">", title, nos, transmitData, authentication = false) {
    this.#nos = nos;
    this.pathLib = path;
    this.version = "basicShell 0.08";
    this.prompt = prompt;
    this.transmitData = transmitData;
    this.origTransmitData = this.transmitData;

    this.nosCodeName = this.#nos.codeName;
    this.nosVersion = this.#nos.version;
    this.nosAuthor = this.#nos.author;
    this.basePath = "";
    this.hostName = this.#nos.hostName;

    this.userInput = 0;
    this.sudoTimeOut = 60 * 1000 * 2;
    this.transmittActive = true;
    this.authentication = authentication;
    this.title = this.version;
    this.keyboardActive = true;
    this.parentShell = null;
    this._pwd = "/";
    this._lastCmd = "";
    this._username = nos.sysConfig.rshLogin.username;
    this.rootActive = false;
    this.interruptSignalListener = [];
    this.promptVisible = true;
    this.id = crypto.randomUUID();
    this.syslog = nos.getDevice("syslogger");
    this.nimbus = nos.getDevice("nimbus");

    this.crt = {
      rows: process.stdout.rows,
      columns: process.stdout.columns,
      write: (data) => {
        if (this.transmitData != null) {
          this.transmitData(data);
          return data;
        }
      },
      textOut: (data) => {
        if (this.transmitData != null) {
          this.transmitData(`${data}\n`);
          return `${data}\n`;
        }
      },
      log: (data) => {
        if (this.transmitData != null) {
          this.transmitData(`${data}\n`);
          return `${data}\n`;
        }
      },
      clear: () => {
        if (this.transmitData != null) {
          this.transmitData("\x1b[2J\x1b[0;0f");
          return "\x1b[2J\x1b[0;0f";
        }
      },
    };
    if (!this.crt.rows) this.crt.rows = 24;
    if (!this.crt.columns) this.crt.columns = 80;

    this.syslog.append(
      `New shell spawn at ${this.crt.rows}:${this.crt.columns} (Rows:Cols)`,
    );

    process.stdout.on("resize", () => {
      let rows = process.stdout.rows;
      let cols = process.stdout.columns;
      this.resizeScreenSize(rows, cols);
    });

    this.termUtil = new TermUtil(this.crt, this);
    this.term = this.termUtil;
    this.autoCompletionList = [];
    this.termUtil.autoCompletionList = this.autoCompletionList;

    this.loadDevices = function (a, b) {
      return this.#nos.loadDevices(a, b);
    };

    this.getDevice = function (deviceName) {
      return this.#nos.getDevice(deviceName);
    };
    this.termUtil.doCtrlC = () => {
      for (let i = 0; i < this.interruptSignalListener.length; i++) {
        this.interruptSignalListener[i]();
      }
      this.nimbus.publish("SYSTEM", { targetShellId: this.id, message: "SIGINT" });
      this.crt.write("^C\n");
      this.showPrompt();
      this.termUtil.showCursor();
    };

    this.termUtil.shellHandler = this.shellHandler.bind(this);
  }

  resizeScreenSize(rows, cols) {
    this.crt.columns = cols;
    this.crt.rows = rows;
  }

  async shellHandler(lastCmd) {
    if (lastCmd.trim() == "") {
      this.showPrompt();
      return;
    }
    this.lastCmd = lastCmd;

    if (lastCmd == "clear") {
      this.crt.clear();
      this.showPrompt();
    } else if (lastCmd == "exit") {
      if (this.onExit != null) this.onExit();
    } else {
      if (lastCmd.includes("|")) {
        const chain = lastCmd.split("|").map((cmd) => cmd.trim());
        console.log(chain);
        this.showPrompt();
      } else {
        await this.executeScript(lastCmd);
      }
    }
  }

  /* * * * * * * * * * * * * * * * * * * * * * ESSENTIAL METHOD * * * * * * * * * * * * * * * * * * * * * */
  set lastCmd(value) {
    this._lastCmd = value;
  }
  get lastCmd() {
    return this._lastCmd;
  }
  set pwd(value) {
    this._pwd = value;
    let dirContents = fs.readdirSync(this._pwd);
    this.term.autoCompletionList =
      this.term.autoCompletionList.concat(dirContents);
  }
  get pwd() {
    return this._pwd;
  }
  set username(value) {
    this._username = value;
  }
  get username() {
    return this._username;
  }

  async executeScript(lastCmd, isFromPipe = false) {
    if (lastCmd.trim() == "") {
      this.showPrompt();
      return;
    }
    this.lastCmd = lastCmd;
    let error = 0;
    try {
      let args = lastCmd.split(" ");
      let cmdName = args[0];
      let fileName = cmdName.endsWith(".js") ? cmdName : cmdName + ".js";
      let fullPath = null;
      // PATCH: handle ~ as home dir
      if (cmdName.startsWith("~")) {
        let userHome = "/home/";// + this.username;
        let relPath = cmdName.slice(1);
        let homePath = relPath ? this.#nos.path.resolve(userHome, relPath.startsWith("/") ? relPath.slice(1) : relPath) : userHome;
        let homeFile = homePath.endsWith(".js") ? homePath : homePath + ".js";
        if (fs.existsSync(homeFile)) {
          fullPath = homeFile;
        }
      }
      // Cek dulu di direktori kerja saat ini (this.pwd) jika belum ketemu
      if (!fullPath) {
        let pwdPath = this.#nos.path.resolve(this.pwd, fileName);
        if (fs.existsSync(pwdPath)) {
          fullPath = pwdPath;
        } else {
          // Kalau tidak ada, baru cari di envPath
          fullPath = this.find(cmdName, this.envPath);
        }
      }
      if (!fullPath) {
        this.crt.textOut("Command not found! ");
        this.showPrompt();
        return 1;
      }
      let directory = this.#nos.path.dirname(fullPath).trim();
      const baseFileName = this.#nos.path.basename(fullPath).trim();
      if (!directory.endsWith("/")) directory += "/";
      let errorLevel = await this.#nos.executeModule(
        directory,
        baseFileName,
        () => { },
        this,
        this.rootActive,
        lastCmd,
      );
    } catch (e) {
      if (e.code == 1 || e.code == 2 || e.code == 3) {
        this.crt.textOut(e.message);
      } else error = 1;
      this.showPrompt();
      error = e.code;
    }
    if (!isFromPipe && error == 0) {
      this.termUtil.addHistory(lastCmd);
    } else {
      if (error == "ERR_INVALID_ARG_TYPE" && lastCmd.trim() != "") {
        this.crt.textOut("Command not found! ");
        this.showPrompt();
      }
    }
    return error;
  }

  addCompletion(str) {
    this.termUtil.autoCompletionList = this.termUtil.autoCompletionList.concat([
      str,
    ]);
  }
  reboot() {
    this.crt.textOut("System rebooting ...");
    this.#nos.shutdown(1);
  }

  terminate() {
    this.showPrompt();
  }

  userPrompt = (prompt, echo) => {
    return new Promise((resolve, reject) => {
      this.userInputHandler = (data) => {
        this.userInput = 0;
        this.transmittActive = true;
        resolve(data);
        if (echo === false) this.crt.write("\n");
      };
      this.userInput = 1;
      this.transmittActive = true;
      this.crt.write(prompt);
      this.transmittActive = echo;
    });
  };

  showPrompt() {
    if (this.promptVisible === true) {
      let str = this.prompt;
      str = str.replaceAll(
        "%pwd",
        this.pwd.length > 1 && this.pwd.endsWith("/") === true
          ? this.pwd.substring(0, this.pwd.length - 1)
          : this.pwd,
      );
      str = str.replaceAll("%username", this.username);
      str = str.replaceAll("%hostname", this.#nos.hostName);
      str = str.replaceAll("%roottag", this.rootActive ? "⚡" : "$");
      this.crt.write(`${str}`);
    }
  }

  checkLogin(username, passwd) {
    const users = this.#nos.sysConfig.rshLogin.users;
    const hashedInput = crypto.createHash("sha1").update(passwd).digest("hex");

    for (let user of users) {
      if (
        (user.username === username &&
          user.password.toUpperCase() === hashedInput.toUpperCase()) ||
        (user.username === username && user.password.trim() === "")
      ) {
        return user; // login sukses
      }
    }

    return null; // login gagal
  }

  getUserInfo(username) {
    const users = this.#nos.sysConfig.rshLogin.users;

    for (let user of users) {
      if (user.username === username) {
        return user; // get sukses, return objek user
      }
    }

    return null; // get gagal
  }

  authLogin(passwdOnly = false) {
    return new Promise((resolve, reject) => {
      let username, passwd;
      if (passwdOnly === false) {
        new userPrompt(
          {
            prompt: "Username: ",
            shell: this,
            once: true,
            echo: true,
            cmdExit: ".exit",
          },
          (data) => {
            this.username = data;
            new userPrompt(
              {
                prompt: "Password: 🔑\u001B[?25l",
                shell: this,
                once: true,
                echo: false,
                cmdExit: ".exit",
              },
              (data) => {
                passwd = data;
                this.crt.write(`\u001B[?25h\n`);
                const loginCheck = this.checkLogin(this.username, passwd);
                if (loginCheck != null) {
                  this.rootActive =
                    loginCheck.userType === "root" ? true : false;
                  resolve(true);
                } else {
                  reject(false);
                }
              },
            );
          },
        );
      } else {
        new userPrompt(
          {
            prompt: "Password: 🔑\u001B[?25l",
            shell: this,
            once: true,
            echo: false,
            cmdExit: ".exit",
          },
          (data) => {
            passwd = data;
            this.crt.write(`\u001B[?25h\n`);
            const loginCheck = this.checkLogin(this.username, passwd);
            if (loginCheck != null) {
              this.rootActive = loginCheck.sudoAllow === true ? true : false;
              resolve(true);
            } else {
              reject(false);
            }
          },
        );
      }
    });
  }

  greeting(greetingCallback, accessDeniedCallBack = null) {
    this.crt.write(`\n:: ${this.version} ::\n`);
    if (this.authentication) {
      this.userInput = 1;
      let attempts = 0;

      const tryLogin = () => {
        this.authLogin()
          .then((valid) => {
            if (greetingCallback) greetingCallback();
            this.showPrompt();
          })
          .catch(() => {
            attempts++;
            if (attempts < 3) {
              this.crt.textOut(`Login failed (${attempts}/3). Try again.\n`);
              tryLogin();
            } else {
              this.crt.textOut("Access denied!\n");
              if (this.onExit) this.onExit();
              if (accessDeniedCallBack) accessDeniedCallBack();
            }
          });
      };

      tryLogin();
    } else {
      if (greetingCallback) greetingCallback();
      this.showPrompt();
    }
  }

  // greeting(greetingCallback, accessDeniedCallBack = null) {
  //   this.crt.write(`\n:: ${this.version} ::\n`);
  //   if (this.authentication) {
  //     this.userInput = 1;
  //     this.authLogin()
  //       .then((valid) => {
  //         // this.crt.textOut("login valid "+valid);
  //         if (greetingCallback) greetingCallback(); //else
  //         // this.crt.write(`\nWelcome to ${this.title}\n`);
  //         this.showPrompt();
  //       })
  //       .catch((valid) => {
  //         this.crt.textOut("Access denied!");
  //         if (this.onExit) this.onExit();
  //         if (accessDeniedCallBack) accessDeniedCallBack();
  //       });
  //   } else {
  //     if (greetingCallback) greetingCallback();
  //     this.showPrompt();
  //   }
  // }

  pushIOKey(io) {
    if (this.keyboardActive === true) {
      //console.log((io.key.sequence.charCodeAt(0)).toString(16));
      this.termUtil.pushIOKey(io);
    } else {
      if (io.key.ctrl === true && io.key.sequence == "\x1a") {
        this.keyboardActive = true;
        this.termUtil.doCtrlC();
        // this.termUtil.pushIOKey( io );
      }
      if (this.emitIOKey != null) {
        this.emitIOKey(io);
      }
      if (this.getKey != null) {
        this.getKey(io);
      }
    }

    return io;
  }

  find(fileName, paths) {
    // const fs = require("fs");
    // const path = require("path");
    // Tambahkan ekstensi .js jika belum ada
    if (!fileName.endsWith(".js")) {
      fileName += ".js";
    }

    const directories = paths.split(";"); // Membagi daftar path
    // console.log(`directories: ${JSON.stringify(directories)}`);
    for (const dir of directories) {
      const fullPath = path.resolve(dir, fileName); // Membuat path absolut
      // console.log(`fullPath: ${fullPath}`);
      if (fs.existsSync(fullPath)) {
        // Mengecek apakah file ada
        return fullPath; // Kembalikan path lengkap jika ditemukan
      }
    }
    return null; // Jika tidak ditemukan
  }

  parseCommand(command) {
    const args = command.match(/(?:[^\s"]+|"[^"]*")+/g); // Ambil argumen, mendukung nilai dalam tanda kutip
    const result = {
      fileName: command.split(" ")[0],
      command: args[0], // Perintah utama
      params: {},
      rawArgs: [], // Semua argumen setelah nama perintah
    };

    let currentFlag = null;
    let nonFlagArgs = []; // Untuk menyimpan argumen non-flag

    args.slice(1).forEach((arg) => {
      const cleanArg = arg.replace(/^"|"$/g, ""); // Hilangkan tanda kutip

      result.rawArgs.push(cleanArg); // Simpan ke rawArgs

      if (arg.startsWith("-")) {
        currentFlag = arg.substring(1);
        result.params[currentFlag] = true;
      } else if (currentFlag) {
        result.params[currentFlag] = cleanArg;
        currentFlag = null;
      } else {
        nonFlagArgs.push(cleanArg);
      }
    });

    // Simpan argumen non-flag di result.params._
    if (nonFlagArgs.length > 0) {
      result.params._ = nonFlagArgs;
    }

    return result;
  }
  parseCommand2(command) {
    const args = command.match(/(?:[^\s"]+|"[^"]*")+/g); // Ambil argumen, mendukung nilai dalam tanda kutip
    const result = {
      fileName: args[0], // Nama file/perintah utama diambil dari argumen pertama
      command: args[0], // Perintah utama (sama dengan fileName untuk kasus ini)
      params: {},
      rawArgs: [], // Semua argumen setelah nama perintah
    };

    let currentFlag = null;
    let nonFlagArgs = []; // Untuk menyimpan argumen non-flag

    // Iterasi dimulai dari argumen kedua (indeks 1) karena yang pertama adalah command/fileName
    args.slice(1).forEach((arg) => {
      const cleanArg = arg.replace(/^"|"$/g, ""); // Hilangkan tanda kutip

      result.rawArgs.push(cleanArg); // Simpan ke rawArgs

      if (cleanArg.startsWith("-")) {
        // Periksa apakah ini flag baru
        currentFlag = cleanArg; // Simpan flag lengkap, termasuk satu atau dua strip
        result.params[currentFlag] = true; // Set nilai default true untuk flag tanpa nilai
      } else if (currentFlag) {
        // Jika ada flag aktif, ini adalah nilai untuk flag tersebut
        result.params[currentFlag] = cleanArg;
        currentFlag = null; // Reset currentFlag setelah nilai diberikan
      } else {
        // Jika tidak ada flag aktif, ini adalah argumen non-flag
        nonFlagArgs.push(cleanArg);
      }
    });

    // Simpan argumen non-flag di result.params._
    if (nonFlagArgs.length > 0) {
      result.params._ = nonFlagArgs;
    }

    return result;
  }
}


// const p1 = new userPrompt({
//   prompt: "blabla",
//   shell: this.shell,
//   once: true,
//   echo: true,
//   cmdExitL "exit"
// }, (data) => {

// })

class userPrompt {
  constructor(config = {}, onEnter) {
    this.shell = config.shell;
    this.prompt = config.prompt || ">";
    this.once = config.once !== undefined ? config.once : true;
    this.echo = config.echo !== undefined ? config.echo : true;
    this.addHistory =
      config.addHistory !== undefined ? config.addHistory : true;
    this.cmdExit = config.cmdExit || ".exit";
    this.onEnter = onEnter;
    this.prompter();
  }

  prompter() {
    this.shell.userPrompt(this.prompt, this.echo).then((data, done) => {
      if (this.once === true || data === this.cmdExit) {
        this.onEnter(data);
      } else {
        this.onEnter(data);
        this.prompter();
      }
    });
  }
}

class userPromptAsync {
  constructor(config = {}, onEnter) {
    this.shell = config.shell;
    this.prompt = config.prompt || ">";
    this.once = config.once !== undefined ? config.once : true;
    this.echo = config.echo !== undefined ? config.echo : true;
    this.addHistory =
      config.addHistory !== undefined ? config.addHistory : true;
    this.cmdExit = config.cmdExit || ".exit";
    this.onEnter = onEnter;
    this._running = false;
    this.prompter();
  }

  async prompter() {
    if (this._running) return;
    this._running = true;

    const data = await this.shell.userPrompt(this.prompt, this.echo);

    if (this.once === true || data === this.cmdExit) {
      await this.onEnter(data);
    } else {
      await this.onEnter(data);
      this._running = false;
      this.prompter();
    }
  }
}

module.exports = { Shell, userPrompt, userPromptAsync };
