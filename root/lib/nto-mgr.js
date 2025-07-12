/***
  NTO Manager
  NOS Telemetry Object Manager
***/
class nto {
  #timeStamp;
  #value;

  constructor(id, name, dataType, maxQueBuf = 10) {
    this.version = "1.2";
    this.id = id;
    this.name = name;
    this.dataType = dataType;
    this.values = [];
    this.maxQueBuf = maxQueBuf;
    this.#timeStamp = null; // current value
    this.#value = null; // current value
  }

  pushValue(value) {
    let tsNow = Date.now();
    let data = {
      value: value,
      timeStamp: tsNow,
    };

    this.#value = value;
    this.#timeStamp = tsNow;

    if (this.values.length >= this.maxQueBuf) {
      this.values.shift(); // buang data paling lama
    }
    this.values.push(data);
  }

  getLastValue() {
    const now = Date.now();
    const age = this.#timeStamp ? now - this.#timeStamp : null; // milisecond
    return {
      value: this.#value,
      timeStamp: this.#timeStamp,
      age: age
    };
  }

  getHistory() {
    return this.values;
  }
}

class ntoManager {
  #ntos;

  constructor() {
    this.#ntos = [];
  }

  addNTO(id, name, dataType, maxQueBuf = 10) {
    this.#ntos.push(new nto(id, name, dataType, (maxQueBuf = 10)));
  }

  getNTOById(id) {
    return this.#ntos.find((n) => n.id === id) || null;
  }

  getNTOByName(name) {
    return this.#ntos.find((n) => n.name === name) || null;
  }

  getNTOList() {
    return this.#ntos;
  }
}

module.exports = { ntoManager, nto };
