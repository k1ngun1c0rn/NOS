const net = require("net");
function matchTopic(topic, pattern) {
    const t = topic.split("/");
    const p = pattern.split("/");

    for (let i = 0; i < p.length; i++) {
        if (p[i] === "#") return true;
        if (p[i] === "+") continue;
        if (!t[i] || t[i] !== p[i]) return false;
    }
    return t.length === p.length;
}

class MiniClientTCP {
    constructor(host = "127.0.0.1", port = 1884) {
        this.host = host;
        this.port = port;
        this.subscribedTopics = new Set();
        this.handlers = {}; // mirip EventEmitter
        this.messageCache = new Set();
        this.lastTimestamp = {};

        this.socket = net.createConnection(this.port, this.host);
        this.socket.setEncoding("utf8");

        let buffer = "";
        this.socket.on("connect", () => {
            this._emit("connect");
            // console.log("Connected!! " + this.host + ":" + this.port)
        });

        setTimeout(() => {
            this.socket.on("data", (data) => {
                buffer += data;
                const lines = buffer.split("\n");
                buffer = lines.pop();

                for (const line of lines) {
                    const [encodedTopic, encodedMsg] = line.trim().split(";");
                    if (!encodedTopic || !encodedMsg) continue;

                    const topic = Buffer.from(encodedTopic, "base64").toString("utf8");
                    const message = Buffer.from(encodedMsg, "base64").toString("utf8");

                    for (const pattern of this.subscribedTopics) {
                        if (matchTopic(topic, pattern)) {
                            this._emit("message", topic, message);
                            break;
                        }
                    }
                }
            });

            this.socket.on("error", (err) => this._emit("error", err));
            this.socket.on("close", () => this._emit("close"));
        }, 1000);
    }

    publish(topic, message) {
        // console.log(`<< ${topic} :: ${message}`);
        const encodedTopic = Buffer.from(topic).toString("base64");
        const encodedMsg = Buffer.from(message).toString("base64");
        const line = `${encodedTopic};${encodedMsg}\n`;
        const client = net.createConnection(this.port, this.host, () => {
            client.write(line);
            client.end();
        });
        client.on("error", () => { });
    }

    subscribe(topic) {
        this.subscribedTopics.add(topic);
        this.socket.write(`SUB:${topic}\n`);
    }

    on(event, callback) {
        this.handlers[event] = callback;
    }

    _emit(event, ...args) {
        if (this.handlers[event]) {
            this.handlers[event](...args);
        }
    }

    end() {
        this.socket.end();
    }

    stop() {
        this.socket.destroy();
    }
}

module.exports = MiniClientTCP;
module.exports.connect = function (uri) {
    let host = "127.0.0.1";
    let port = 1884;

    if (uri) {
        const parts = uri.split(":");
        host = parts[0] || "127.0.0.1";
        port = parseInt(parts[1]) || 1884;
    }

    return new MiniClientTCP(host, port);
};
