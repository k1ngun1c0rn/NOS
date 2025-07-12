const { JSONCookie } = require('cookie-parser');

module.exports = {
  version: 0.3,
  main : function (os) {    
    let self = this;    
    var devices = [
      {name: "display", objectName: "display"}  
      ];
    self.failed = (!self.shell.loadDevices(devices, self));
    self.display = self.shell.crt;
    if (self.failed == 0) {
      self.getNICs = function () {
        //'use strict';
        const { networkInterfaces } = require('os');
        const nets = networkInterfaces();
        const results = Object.create(null); // Or just '{}', an empty object
        let msg = "";
        for (const name of Object.keys(nets)) {
          for (const net of nets[name]) {
                // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
                // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
            const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
            if (net.family === familyV4Value && !net.internal) {
              if (!results[name]) {
                results[name] = [];
              }
              msg+=name+": "+net.address+"\r\n";
              results[name].push(net.address);
            }
          }           
        }
        return msg;
      }
      let nics = self.getNICs();
      self.display.textOut(nics);
      // for (let i=0; i<nics.length; i++) {        
      //   self.display.textOut(nics[i]);
      // }
      
      self.shell.terminate();
      
      //self.display.textOut("aaaa");
    } else {
      self.display.log("failed ya")
    }   
    
  }
}