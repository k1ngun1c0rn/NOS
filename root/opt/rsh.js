module.exports = {
	instanceName: "dynamic_rsh",
	name: "Dynamic RSH",
	version: 0.6,
	needRoot: false,
	main: function (nos) {
		const args = this.shell.parseCommand(this.shell.lastCmd);
		const keys = Object.keys(args.params);
		let commDevice = __APP.defaultComm;
		if (keys.includes("c")) {
			commDevice = args.params.c;
			// console.log("comm terpilih: " + commDevice)
		}

		const devices = [{ name: commDevice, objectName: "mqtnl" }];
		const mqtnl = this.mqtnl;
		this.shell.loadDevices(devices, this);
		this.display = this.shell.crt;
		const core_encryption = __APP.core.encryption; //. this.shell.core_encryption;

		this.showSyntax = () => {
			this.display.textOut(
				`Syntax: ${args.command} <host>:<port> [-c <comm device>]`,
			);
			this.shell.terminate();
		};
		const Flags = bfs.require("/lib/packetFlags.js");
		class RemoteShell {
			constructor(address, port, parentShell, mqtnl, transmitData) {
				this.active = false;
				this.address = address;
				this.port = port;
				this.parentShell = parentShell;
				this.conn = new mqtnl.mqtnlConnection(
					mqtnl.connMgr,
					Math.ceil(Math.random() * 65000 + 1),
					(data, sender) => {
						// this.conn = new mqtnl.mqtnlConnection(mqtnl.connMgr, mqtnl.connMgr.generateRandomPort(1,65500), (data, sender) => {
						// console.log("RSH Incoming: "+JSON.stringify(data.header));
						try {
							if (
								data.header.packetHeaderFlag >= Flags.FLAG_SECURITY_NONE &&
								data.header.packetHeaderFlag <= Flags.FLAG_SECURITY_NONE + 20
							) {
								// console.log("Incoming: "+ JSON.stringify(data));

								core_encryption.setSecurityAgent(
									mqtnl,
									Flags.flagToAgentName(data.header.packetHeaderFlag),
								);
								// request to connect
								let rshData = { payload: "requestConnect", io: null };
								console.log(
									"Connect from port: " +
										this.conn.port +
										" using " +
										Flags.flagToAgentName(data.header.packetHeaderFlag),
								);
								this.conn.reply(JSON.stringify(rshData), sender);
								// console.log("Kesinih");
							}
							if (data.payload == "!connectAccept!") {
								// console.log("* Connected");
								this.parentShell.keyboardActive = false;
								this.active = true;
							} else if (data.payload == "!exit!") {
								// console.log("* Disconnected");
								this.parentShell.keyboardActive = true;
								parentShell.terminate();
								this.active = false;
							} else {
								if (this.parentShell.keyboardActive === false)
									transmitData(data.payload);
							}
						} catch (e) {
							console.log(e);
						}
					},
				);
				let rshData;
				if (keys.includes("-force-aes")) {
					core_encryption.setSecurityAgent(mqtnl, "AES256");
					rshData = { payload: "requestConnect", io: null };
					// console.log("XXXXXconenct from port: "+this.conn.port);
					this.conn.write(this.address, this.port, JSON.stringify(rshData), 0);
				} else {
					this.conn.write(
						this.address,
						this.port,
						"",
						Flags.FLAG_SECURITY_HANDSHAKE_REQ,
					);
				}
			}

			pushIOKey(io) {
				if (this.parentShell.keyboardActive === false) {
					let rshData = {
						payload: "io",
						io: io,
					};
					if (this.emitIOKey != null) this.emitIOKey(io);
					this.conn.write(this.address, this.port, JSON.stringify(rshData), 0);
				}
				// Set up timeout for waiting for a response
			}
		}

		if (args.params._ != null && args.params._.length > 0) {
			const hValues = args.params._[0].split(":");
			this.dstAddress = hValues[0]; // address
			this.dstPort = parseInt(hValues[1]) || 22; // port
			// this.crt.textOut("xx "+this.dstAddress);
			if (typeof this.shell.addCompletion != "undefined")
				this.shell.addCompletion(this.dstAddress);
			this.remoteShell = new RemoteShell(
				this.dstAddress,
				this.dstPort,
				this.shell,
				this.mqtnl,
				(data) => {
					// clearTimeout(this.responseTimeout);
					if (this.remoteShell.active == true) this.display.write(data);
				},
			);

			this.shell.emitIOKey = (io) => {
				this.remoteShell.pushIOKey(io);
				// this.responseTimeout = setTimeout(() => {
				//     // If no response in time, terminate
				//     this.shell.keyboardActive = true;
				//     //this.parentShell.terminate();
				// }, 5000); // Timeout after 5 seconds, sesuaikan dengan kebutuhan
			};
		} else {
			this.showSyntax();
		}
	},
};
