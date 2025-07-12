
const CryptoJS = require("crypto-js");

class AES256Agent {
  static name = "AES256";
  static description = "This is AES256 encryption/decryption";
  constructor(key) {
    this.name = AES256Agent.name;
    this.description = AES256Agent.description;

    this.setKey(key);
  }

  setKey(key) {
    this.key = key;
  }

  cipher(data) {
    return CryptoJS.AES.encrypt(data, this.key).toString();
  }

  decipher(data) {
    return CryptoJS.AES.decrypt(data, this.key).toString(CryptoJS.enc.Utf8);
  }
}

module.exports = AES256Agent;