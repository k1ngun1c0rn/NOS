const path = require("path");

module.exports = {
  name: "bpool",
  description:
    "Operasi file & direktori di NOS BFS (mkdir, create, open, read, ls, rm, rmdir)",
  version: "1.1",
  needRoot: false,
  main: function (nos) {
    // Gunakan driver bfs
    const devices = [{ name: "bfsAccess", objectName: "bfs" }];
    this.shell.loadDevices(devices, this);
    this.crt = this.shell.crt;

    let args = this.shell.lastCmd.trim().split(/\s+/);
    let cmd = args[1];
    let target = args[2];
    let extra = args.slice(3).join(" ");
    let output = "";

    try {
      switch (cmd) {
        case "mkdir": {
          if (!target) throw new Error("Argumen direktori wajib");
          this.bfs.mkdirSync(target, { recursive: true });
          output = `📁 Direktori dibuat: ${target}`;
          break;
        }
        case "create": {
          if (!target) throw new Error("Argumen path file BFS wajib");
          target = nos.basePath + target;
          if (typeof this.bfs.create === "function") {
            if (this.bfs.create.constructor.name === "AsyncFunction") {
              this.bfs
                .create(target)
                .then(() => {
                  this.crt.textOut(`BFS baru dibuat: ${target}\n`);
                  this.shell.terminate();
                })
                .catch((e) => {
                  this.crt.textOut(`❌ Error create: ${e.message}\n`);
                  this.shell.terminate();
                });
              return;
            } else {
              this.bfs.create(target);
              output = `BFS baru dibuat: ${target}`;
            }
          } else {
            throw new Error("Driver BFS tidak mendukung create(path)");
          }
          break;
        }
        case "read": {
          if (!target) throw new Error("Argumen file wajib");
          const content = this.bfs.readFileSync(target);
          output = `${content}`;
          break;
        }
        case "append": {
          if (!target) throw new Error("Argumen file wajib");
          if (!extra) throw new Error("Argumen data wajib");
          this.bfs.appendFileSync(target, extra);
          output = `✅ Data di-append ke ${target}`;
          break;
        }
        case "ls": {
          const dir = target || "/";
          const list = this.bfs.readdirSync(dir).map((name) => {
            const stats = this.bfs.statSync(path.join(dir, name));
            return {
              name,
              is_directory: stats.isDirectory(),
              owner_user: "root", // Default owner
              owner_group: "root", // Default group
              filemod_owner: "rwx", // Default permissions
              filemod_group: "rwx",
              filemod_other: "rwx",
            };
          });

          output =
            `${dir}:\n` +
            list
              .map((f) => {
                const type = f.is_directory ? "/" : "";
                const perms = `${f.filemod_owner || "---"}${f.filemod_group || "---"}${f.filemod_other || "---"}`;
                const owner = `${f.owner_user || "-"}:${f.owner_group || "-"}`;
                return ` - ${(f.name + type).padEnd(30)}[${perms}]  (${owner})`;
              })
              .join("\n");
          break;
        }
        case "rm": {
          if (!target) throw new Error("Argumen file wajib");
          this.bfs.deleteFileSync(target);
          output = `Dihapus: ${target}`;
          break;
        }
        case "rmdir": {
          if (!target) throw new Error("Argumen direktori wajib");
          this.bfs.deleteFileSync(target);
          output = `Direktori dihapus: ${target}`;
          break;
        }
        case "close": {
          this.bfs.close();
          break;
        }
        case "export": {
          if (!target || !extra)
            throw new Error("Usage: bpool export <bfsfile> <localfile>");
          const content = this.bfs.readFileSync(target);
          require("fs").writeFileSync(this.shell.basePath + extra, content);
          output = `✅ Diekspor ke ${extra}`;
          break;
        }
        case "import": {
          if (!target) throw new Error("Usage: bpool import <localfile> [bfsfile]");
          const content = require("fs").readFileSync(this.shell.basePath + target);

          // Jika bfsfile tidak diisi, otomatis potong dari 'root/'
          if (!extra) {
            const relativePath = target.replace(/^.*?\/root\//, "");
            extra = "/" + relativePath;
          }

          this.bfs.writeFileSync(extra, content);
          output = `✅ Diimpor ke ${extra}`;
          break;
        }
        case "open": {
          if (!target) throw new Error("Argumen path file BFS wajib");
          target = nos.basePath + target;
          if (typeof this.bfs.open === "function") {
            if (this.bfs.open.constructor.name === "AsyncFunction") {
              this.bfs
                .open(target)
                .then(() => {
                  this.crt.textOut(`BFS dibuka: ${target}\n`);
                  this.shell.terminate();
                })
                .catch((e) => {
                  this.crt.textOut(`❌ Error open: ${e.message}\n`);
                  this.shell.terminate();
                });
              return;
            } else {
              this.bfs.open(target);
              output = `BFS dibuka: ${target}`;
            }
          } else {
            throw new Error("Driver BFS tidak mendukung open(path)");
          }
          break;
        }
        case "write": {
          if (!target) throw new Error("Argumen file wajib");
          if (this.bfs.existsSync(target)) {
            throw new Error(`File sudah ada: ${target}`);
          }
          this.bfs.writeFileSync(target, extra || "");
          output = `📄 File baru dibuat: ${target}`;
          break;
        }
        default:
          output = `Perintah: bpool <mkdir|create|open|write|read|ls|append|rm|rmdir|import|export> <target> [isi]`;
      }
    } catch (err) {
      output = `❌ Error: ${err.message}`;
    }

    this.crt.textOut(output);
    this.shell.terminate();
  },
};
