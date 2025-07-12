module.exports = {
    name: "ls",
    description: "List files and directories in the given path",
    version: "1.3",
    needRoot: false,
    main: function (os) {
        const devices = [{ name: "bfsAccess", objectName: "fd" }];
        this.shell.loadDevices(devices, this);
        this.crt = this.shell.crt;
        const path = this.shell.pathLib;
        // this.crt.textOut("📂 Listing files...");
        // Gunakan parseCommand untuk argumen
        const parsed = this.shell.parseCommand(this.shell.lastCmd);
        let dirPath = parsed.params._ && parsed.params._[0] ? parsed.params._[0] : this.shell.pwd;
        // PATCH: jika path relatif, gabungkan dengan cwd
        if (!dirPath.startsWith("/")) {
            dirPath = path.join(this.shell.pwd, dirPath);
        }
        let fullOutput = "";

        const printList = (list, statMap) => {
            // Urutkan direktori di atas, file  di bawah, lalu alfabetis (rekursif)
            list.sort((a, b) => {
                const aIsDir = a.endsWith('/');
                const bIsDir = b.endsWith('/');
                if (aIsDir && !bIsDir) return -1;
                if (!aIsDir && bIsDir) return 1;
                return a.localeCompare(b);
            });
            if (useLineMode) {
                // console.log(statMap)
                list.forEach((item) => {
                    const stat = statMap[item.replace(/\/$/, "")];
                    if (stat) {
                        // Format mode
                        const mode = (stat.mode & 0o777).toString(8).padStart(3, '0');
                        const rwx = mode.split('').map(d => {
                            d = parseInt(d);
                            return ((d & 4) ? 'r' : '-') + ((d & 2) ? 'w' : '-') + ((d & 1) ? 'x' : '-');
                        }).join('');
                        // Owner (user:group)
                        const owner = (stat.owner_user || '-') + ':' + (stat.owner_group || '-');
                        // Size
                        const size = stat.size !== undefined ? stat.size : '-';
                        // Modified time (YYYY-MM-DD HH:mm)
                        let mtime = '-';
                        if (stat.mtime) {
                            const dt = new Date(stat.mtime);
                            dt.setHours(dt.getHours() + 7);
                            mtime = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0') + ' ' + String(dt.getHours()).padStart(2, '0') + ':' + String(dt.getMinutes()).padStart(2, '0');
                        }
                        if (parsed.params.c)
                            fullOutput += `${item.padEnd(20)} ${(statMap[item]) ? statMap[item].checksum : ""}\n`;
                        else
                            fullOutput += `${item.padEnd(20)} ${owner.padEnd(12)} ${rwx} ${(((size / 1024).toFixed(1)).toString() + 'KB').padStart(6)} ${mtime}\n`;
                    } else {
                        fullOutput += item + "\n";
                    }
                });
            } else {
                const maxWidth = 25;
                const columns = Math.floor(this.crt.columns / maxWidth) || 1;
                let line = "";
                list.forEach((item, index) => {
                    line += item.padEnd(maxWidth);
                    if ((index + 1) % columns === 0) {
                        fullOutput += line + "\n";
                        line = "";
                    }
                });
                if (line) fullOutput += line + "\n";
            }
        };

        // PATCH: support file(s) and wildcards as parameter (NOS-aware glob)
        let paramsArr = [];
        if (Array.isArray(parsed.params._) && parsed.params._.length) {
            paramsArr = paramsArr.concat(parsed.params._);
        }
        // Jika -l diikuti argumen (misal -l sub.js), parser akan set params.l = 'sub.js'
        // Anggap itu sebagai argumen file juga
        let useLineMode = false;
        if (typeof parsed.params.l === 'string') {
            paramsArr.push(parsed.params.l);
            useLineMode = true;
        } else if (parsed.params.l === true) {
            useLineMode = true;
        }
        if (paramsArr.length === 0) paramsArr = [this.shell.pwd];
        let paths = [];
        for (let param of paramsArr) {
            if (param.includes('*') || param.includes('?')) {
                // Wildcard: expand using NOS fs, not node glob
                let baseDir = this.shell.pwd;
                let pattern = param;
                if (!pattern.startsWith('/')) pattern = path.join(baseDir, pattern);
                let dir = path.dirname(pattern);
                let mask = path.basename(pattern);
                let list = [];
                try {
                    list = this.fd.readdirSync(dir);
                } catch (e) {
                    this.crt.textOut(`ls: cannot access '${dir}': ${e.message}`);
                    this.shell.terminate();
                    return;
                }
                // Convert wildcard mask to regex
                let regex = new RegExp('^' + mask.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
                let matches = list.filter(f => regex.test(typeof f === 'object' && f !== null && 'name' in f ? f.name : f));
                if (matches.length === 0) {
                    this.crt.textOut(`ls: cannot access '${param}': No such file or directory`);
                    this.shell.terminate();
                    return;
                }
                paths = matches.map(f => path.join(dir, typeof f === 'object' && f !== null && 'name' in f ? f.name : f));
            } else {
                // Single file/dir
                if (!param.startsWith('/')) param = path.join(this.shell.pwd, param);
                paths.push(param);
            }
        }
        fullOutput = "";
        let totalDirs = 0, totalFiles = 0;
        for (const dirPath of paths) {
            let statMap = {};
            let list = [];
            try {
                const stats = this.fd.statSync(dirPath);
                if (stats.isDirectory()) {
                    // Dir: list contents
                    let files = this.fd.readdirSync(dirPath);
                    for (const fileObj of files) {
                        let fileName = typeof fileObj === 'object' && fileObj !== null && 'name' in fileObj ? fileObj.name : fileObj;
                        const filePath = path.resolve(dirPath + '/' + fileName);
                        try {
                            const fstat = this.fd.statSync(filePath);
                            statMap[fileName] = fstat;
                            if (fstat.isDirectory()) {
                                list.push(fileName + '/');
                                totalDirs++;
                            } else {
                                list.push(fileName);
                                totalFiles++;
                            }
                        } catch (err) {
                            list.push(fileName);
                            totalFiles++;
                        }
                    }
                    fullOutput += `\n${dirPath}:\n`;
                    printList(list, statMap);
                } else {
                    // File: show info
                    let fileName = path.basename(dirPath);
                    statMap[fileName] = stats;
                    list.push(fileName);
                    printList(list, statMap);
                    totalFiles++;
                }
            } catch (err) {
                this.crt.textOut(`ls: cannot access '${dirPath}': ${err.message}`);
            }
        }
        fullOutput += `\n📁 Directories: ${totalDirs}   📄 Files: ${totalFiles}\n`;
        if (typeof this.shell.lineBuffer === "string") {
            this.shell.lineBuffer = fullOutput;
        } else {
            this.crt.textOut(fullOutput);
        }
        this.shell.terminate();
    },
};