module.exports = {
  version: 0.2,
  main : function () {    
    this.crt.textOut(this.shell.hostName);
    this.shell.terminate();        
  }
}