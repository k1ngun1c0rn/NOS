const readline = require('readline');

class KeyboardDriver {
  constructor(os) {
    this.name = "keyboard";
    this.os = os;
    this.devClass = "Keyboard";
    this.version = 0.01;
    this.lastKey = {};
    this.listeners = [];

    // Set up keypress listener
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.on('keypress', (chunk, key) => {
      if (key && key.ctrl === true && key.name === 'x') {
        process.exit();
      }
      this.handleKeyPress({ key });
    });
  }

  // Menambahkan listener untuk keypress
  addListener(name, callback, options = {}) {
    if (!this.findListener(name)) {
      this.listeners.push({ name, callback, options });
    }
  }

  // Mencari listener berdasarkan nama
  findListener(name) {
    return this.listeners.find(listener => listener.name === name);
  }

  // Menangani keypress dan memanggil listener yang sesuai
  handleKeyPress(key) {
    this.lastKey = key;
    this.listeners.forEach(listener => {
      listener.callback(key);
    });
  }
}

module.exports = { KeyboardDriver };


/* * * * * * *
{
  key: { sequence: 'e', name: 'e', ctrl: false, meta: false, shift: false }
}
{
  key: {
    sequence: ' ',
    name: 'space',
    ctrl: false,
    meta: false,
    shift: false
  }
}
* * * * * */