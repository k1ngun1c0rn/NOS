class Terminal {
  constructor(id, crt, keyboard) {
    this.id = id;
    this.crt = crt;
    this.keyboard = keyboard;    
    this.kbBuffer = [];
    this.kbEvent = null;
    this.keyboard.addListener(this.id, (io) => {
      if (this.kbEvent!=null) this.kbEvent(io);
    });
    this.greeting();
  }

  greeting () {
    //this.crt.textOut(`Local Terminal`);
  }
}

module.exports = { Terminal };