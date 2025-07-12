
class noneEncryption {
  static name = "none";
  static description = "This is none encryption/decryption";
  constructor(key) {
    this.name = noneEncryption.name;
    this.description = noneEncryption.description;
    this.setKey(key);
  }

  setKey(key) {
    this.key = key;
  }

  cipher(data) {
    return data;
  }

  decipher(data) {
    return data;
  }
}

class reverseEncryption {
  static name = "reverse";
  static description = "This is Reverse encryption/decryption";
  constructor(key) {
    this.name = reverseEncryption.name;
    this.description = reverseEncryption.description;
    this.setKey(key);
  }

  setKey(key) {
    this.key = key;
  }

  cipher(data) {
    return data.split("").reverse().join("");
  }
  decipher(data) {
    return data.split("").reverse().join("")
  }
}

const reverseAgent = {
  name: "reverse",

};

module.exports = { noneEncryption, reverseEncryption };