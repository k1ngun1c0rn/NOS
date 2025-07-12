module.exports = {
  certID: "2dba3771c109db64a0f7dfb22a2cbc6b84dd104e",
  hostName: "dec",
  packageManager: {
    trustedSigners: [
      "70:7d:72:17:0f:2c:38:4e:57:94:0a:77:61:49:b2:96:e4:69:de:f5:2b:34:15:9e:cd:75:7e:7c:cc:9f:55:38"
    ]
  },
  rshLogin: {
    users: [
      {
        username: "root",
        password: "10d0b55e0ce96e1ad711adaac266c9200cbc27e4",
        userType: "root",
        sudoAllow: true
      },
      {
        username: "andri",
        password: "10d0b55e0ce96e1ad711adaac266c9200cbc27e4",
        userType: "regular",
        sudoAllow: true
      },
      {
        username: "guest",
        password: "",
        userType: "regular",
        sudoAllow: false
      },
      {
        username: "undefined",
        password: "",
        userType: "regular",
        sudoAllow: false
      }
    ]
  },
  chacha20poly: {
    key: [
      0xAE, 0x8B, 0xB7, 0x4F, 0xC0, 0x14, 0x94, 0xEC,
      0x8E, 0x20, 0x34, 0x52, 0xB5, 0x17, 0x50, 0xD7,
      0xAF, 0x79, 0x8F, 0x3D, 0xE6, 0x14, 0x18, 0x6F,
      0x32, 0x51, 0xAE, 0xA4, 0x78, 0x74, 0x3F, 0x60
    ],
    esp32key: [
      0x81, 0xFF, 0x71, 0xED, 0x57, 0x4E, 0x54, 0x59,
      0x76, 0x90, 0xAE, 0x7B, 0x04, 0xE4, 0xEF, 0x5F,
      0xC8, 0x74, 0x97, 0xFE, 0x10, 0xB6, 0xB0, 0x37,
      0xCB, 0x03, 0x1A, 0xF7, 0xC7, 0xD6, 0x76, 0x19
    ]
  },
  shell: {
    manager: "/base/microShell",
    needLogin: 0
  },
  remoteShell: {
    needLogin: 1
  }
};
