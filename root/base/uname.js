module.exports = {
	version: 0.21,
	main: function (nos) {
		let display = this.shell.crt;
		display.textOut(`${this.shell.nosCodeName} - ${this.shell.nosVersion}, Shell Version ${this.shell.version}, \n` +
			`${__APP.distro.version}, Author: ${this.shell.nosAuthor}`);
		this.shell.terminate();
	}
}