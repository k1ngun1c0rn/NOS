module.exports = {
	version: "1.0",
	author: "Canding & ChatGPT",
	description: "Menampilkan penggunaan memori script secara detail.",
	main: function (os) {
		this.crt = this.shell.crt;

		const mem = process.memoryUsage();
		const format = (val) => Math.round(val / 1024 / 1024 * 100) / 100;

		const heapUsed = format(mem.heapUsed);
		const heapTotal = format(mem.heapTotal);
		const rss = format(mem.rss);
		const external = format(mem.external);
		const arrayBuffers = format(mem.arrayBuffers);

		const jsUsage = heapUsed + external + arrayBuffers;

		this.crt.textOut(`📊 Memory Usage of This Script`);
		this.crt.textOut(`-----------------------------`);
		this.crt.textOut(`Heap Used     : ${heapUsed} MB`);
		this.crt.textOut(`Heap Total    : ${heapTotal} MB`);
		this.crt.textOut(`RSS (Total)   : ${rss} MB`);
		this.crt.textOut(`External      : ${external} MB`);
		this.crt.textOut(`Array Buffers : ${arrayBuffers} MB`);
		this.crt.textOut(`-----------------------------`);
		this.crt.textOut(`🧠 JS-Level Usage   : ${Math.round(jsUsage * 100) / 100} MB`);
		this.crt.textOut(`📦 V8 Heap Capacity : ${heapTotal} MB`);
		this.crt.textOut(`💾 Total RAM (RSS)  : ${rss} MB`);

		this.shell.terminate();
	}
}
