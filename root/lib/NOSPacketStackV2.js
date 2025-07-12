class NOSPacketStackV2 {
  constructor(connection) {
    this.version = "0.12"; // Updated version after refactor
    this.connection = connection;
    this.sessionTable = {};
    this.defaultAgent = null;
    this.payloadHandler = null;
    this.authHandler = null;

    this.onNewSession = () => { };
    this.onSessionExpired = () => { };
    this.onAuthRequired = () => { };

    this.connection.onReceive((data, senderStr) => {
      try {
        const [srcStr] = senderStr.split("->");
        const [srcAddress, srcPort] = srcStr.split(":");
        const src = { address: srcAddress, port: parseInt(srcPort) };
        const sessionID = `${src.address}:${src.port}`;

        let session = this.sessionTable[sessionID];
        if (!session) {
          session = this._createSession(sessionID);
          this.onNewSession(session, src);
        }

        session.lastActivity = Date.now();
        clearTimeout(session._ttlTimer);
        session._ttlTimer = setTimeout(() => {
          this.onSessionExpired(this._makeSessionObj(sessionID));
          delete this.sessionTable[sessionID];
        }, session.ttl);

        const agent = session.agent || this.defaultAgent;
        const decrypted = agent?.decipher
          ? agent.decipher(data.payload)
          : data.payload;

        // First check if the message is an authentication attempt
        if (
          decrypted &&
          typeof decrypted === "string" &&
          decrypted.startsWith("__auth::")
        ) {
          if (this.authHandler) {
            const token = decrypted.split("::")[1];
            session.isAuthenticated = this.authHandler(token)
          } else {
            session.isAuthenticated = false;
          }
          // const token = decrypted.split("::")[1];          
          // if (token === "123456") {
          //   session.isAuthenticated = true;
          // } else {
          // }

          if (typeof this.onAuthVerified === "function") {
            this.onAuthVerified(session, src, session.isAuthenticated);
          }
          return;
        }

        // Then check if authentication is required and not yet authenticated
        if (session.authRequired && !session.isAuthenticated) {
          if (typeof this.onAuthRequired === "function") {
            this.onAuthRequired(session, src);
          }
          return;
        }

        // Process payload normally if authenticated or no auth required
        if (this.payloadHandler && typeof this.payloadHandler === "function") {
          this.payloadHandler(decrypted, src);
        }
      } catch (err) {
        // console.log("❌ Error in onReceive:", err.message);
      }
    });
  }

  _makeSessionID(obj) {
    return `${obj.address}:${obj.port}`;
  }

  _makeSessionObj(sessionID) {
    const [address, portStr] = sessionID.split(":");
    return {
      address,
      port: parseInt(portStr),
    };
  }

  _createSession(id) {
    return (this.sessionTable[id] = {
      id,
      lastActivity: Date.now(),
      ttl: 60000,
      agent: null,
      authRequired: false,
      isAuthenticated: true,
      connected: false,
      _ttlTimer: null,
    });
  }

  getSession(sessionObj) {
    const id = this._makeSessionID(sessionObj);
    return this.sessionTable[id];
  }

  setAgentFor(sessionObj, agent) {
    const id = this._makeSessionID(sessionObj);
    const session = this.sessionTable[id] || this._createSession(id);
    session.agent = agent;
  }

  setTTLFor(sessionObj, ttl) {
    const id = this._makeSessionID(sessionObj);
    const session = this.sessionTable[id] || this._createSession(id);
    session.ttl = ttl;
  }

  setAuthRequired(sessionObj, require = true) {
    const id = this._makeSessionID(sessionObj);
    const session = this.sessionTable[id] || this._createSession(id);
    session.authRequired = require;
    session.isAuthenticated = !require;
  }

  setDefaultAgent(agent) {
    this.defaultAgent = agent;
  }

  send(dstObj, payload, options = {}) {
    const id = this._makeSessionID(dstObj);
    const session = this.sessionTable[id] || this._createSession(id);
    const agent = session.agent || this.defaultAgent;
    const encrypted = agent?.cipher ? agent.cipher(payload) : payload;
    const flag =
      options.packetHeaderFlag !== undefined ? options.packetHeaderFlag : 0;
    this.connection.write(dstObj.address, dstObj.port, encrypted, flag);
  }

  close(onSessionClose = null) {
    this.deleteAllSession(onSessionClose);
  }

  deleteSession(dstObj, onSessionClose = null) {
    const id = this._makeSessionID(dstObj);
    if (this.sessionTable[id]) {
      if (onSessionClose) onSessionClose(dstObj);
      this.sessionTable[id].connected = false;
      delete this.sessionTable[id];
      // console.log(`🗑️ Session deleted for ${id}`);
    } else {
      // console.log(`⚠️ No session found for ${id}`);
    }
  }

  deleteAllSession(onSessionClose = null) {
    for (const id in this.sessionTable) {
      const sessionObj = this._makeSessionObj(id);
      this.deleteSession(sessionObj, onSessionClose);
    }
    // console.log(`🧹 All sessions deleted.`);
  }

  setHandler(fn) {
    this.payloadHandler = fn;
  }

  setAuthHandler(fn) {
    this.authHandler = fn;
  }
}

module.exports = NOSPacketStackV2;
