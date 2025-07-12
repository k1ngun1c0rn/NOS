module.exports = {
	name: "Show application version",
	description: "Jadi tahu versi aplikasi",
	version: 0.8,
	main: function (os) {
		let self = this;
		var devices = [
			{ name: "bfsAccess", objectName: "fd" }
		];
		self.failed = (!self.shell.loadDevices(devices, self));
		self.display = self.shell.crt;
		if (self.failed == 0) {
			// Parsing command-line arguments
			const args = this.shell.parseCommand(this.shell.lastCmd);

			const showSyntax = () => {
				this.display.textOut(`Syntax: ${args.command} <filename>`);
				this.shell.terminate();
			}


			if (!args.params._) {
				showSyntax();
				return;
			}
			if (!args.params._[0].endsWith('.js')) args.params._[0] += ".js";
			const filename = this.shell.pwd + args.params._[0];
			// console.log("filename", filename);

			if (!this.fd.fileExistsSync(filename)) {
				this.display.textOut("File not found! " + filename);
				this.shell.terminate();
				return;
			}

			let jcontent;
			// Menggunakan fileDriver untuk membaca file
			this.fd.readFile(filename, (err, fileContent) => {
				if (err) {
					this.display.textOut(`Error: Cannot read file '${filename}'`);
				} else {
					let error = 0;
					try {
						let fn = filename;
						// delete require.cache[require.resolve(fn)];
						bfs.clearCache(fn);
						jcontent = bfs.require(fn);
						// return;
					} catch (e) {
						self.display.textOut("ERROR: " + e);
						self.shell.terminate();
						error = 1;
					}
					if (error == 0) {
						//self.display.textOut(args[1]);
						if (typeof jcontent.version != "undefined") {
							self.display.textOut(`Name: ${typeof jcontent.name == "undefined" ? "-" : jcontent.name}`);
							self.display.textOut(`Description: ${typeof jcontent.description == "undefined" ? "-" : jcontent.description}`);
							self.display.textOut(`Version: ${typeof jcontent.version == "undefined" ? "-" : jcontent.version}`);
							self.display.textOut(`Author: ${typeof jcontent.author == "undefined" ? "-" : jcontent.author}`);
						} else
							self.display.textOut("No information available!");
					}
				}
				this.shell.terminate();
			});
			//self.shell.terminate();
		} else {
			self.display.textOut("failed ya")
		}
	}
}