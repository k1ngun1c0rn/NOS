module.exports = {
	name: "historylogger",
	version: 0.2,
	main: function (nos) {
		this.display = this.shell.crt;
		let baseDir = process.cwd();
		let args = this.shell.lastCmd.split(" ");

		cmdHistory = [];
		if (fs.fileExistsSync("/home/cmdHist.txt")) {
			let content = fs.readFileSync("/home/cmdHist.txt").split("\r\n");

			for (let i = 0; i < content.length; i++)
				this.shell.term.addHistory(content[i]);
			this.shell.term.historyIdx = this.shell.term.history.length;
		} else {
			fs.writeFileSync("/home/cmdHist.txt", "");
			this.display.textOut("/home/cmdHist.txt created!");
		}

		this.shell.cmdHistoryFiller = (cmd) => {
			if (cmd.trim().substring(0, 3) != "run")
				if (this.shell.term.addHistory(cmd) == 0) {
					fs.appendFileSync("/home/cmdHist.txt", cmd + "\r\n");
				} else {
				}

		};
		this.saveHistory = () => {
			let content = "";
			for (let i = 0; i < this.shell.term.history.length; i++)
				content += this.shell.term.history[i] + "\r\n";
			fs.writeFileSync("/home/cmdHist.txt", content);
		};
		this.removeHistory = () => {
			this.display.textOut(
				"Removing history.." + baseDir + "/home/cmdHist.txt",
			);
			try {
				fs.deleteFileSync("/home/cmdHist.txt", (err) => {
					if (err) throw err;
					this.display.textOut("/home/cmdHist.txt" + " was deleted");
				});
			} catch (e) {
				this.display.textOut(e);
			}
		};
		this.shell.saveHistory = this.saveHistory;
		this.shell.removeHistory = this.removeHistory;
	},
};
