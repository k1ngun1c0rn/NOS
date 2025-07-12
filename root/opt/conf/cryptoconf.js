module.exports = function (envParams) {

  if (!envParams.nos.__CORE) envParams.nos.__CORE = {};
  if (!envParams.nos.__CORE.encryption) {
    envParams.nos.__CORE.encryption = this.core_encryption;
  }
  const EncryptionCore = bfs.require(`/lib/encryption_core`);
  envParams.nos.__CORE.encryption = new EncryptionCore();
  __APP.core.encryption = envParams.nos.__CORE.encryption;

  const AES256Agent = bfs.require(`/opt/crypto/cryptography/aes-agent`);
  const ChaCha20Agent = bfs.require(`/opt/crypto/cryptography/chacha20poly`);
  const RSAAgent = bfs.require(`/opt/crypto/cryptography/rsa-agent`);
  const noneEncryption =
    bfs.require(`/opt/crypto/cryptography/none-encryption`).noneEncryption;
  const reverseEncryption =
    bfs.require(`/opt/crypto/cryptography/none-encryption`).reverseEncryption;

  // Register semua agent class
  envParams.nos.__CORE.encryption.registerEncryption(AES256Agent);
  envParams.nos.__CORE.encryption.registerEncryption(ChaCha20Agent);
  envParams.nos.__CORE.encryption.registerEncryption(RSAAgent);
  envParams.nos.__CORE.encryption.registerEncryption(noneEncryption);
  envParams.nos.__CORE.encryption.registerEncryption(reverseEncryption);

  // create instance encryption
  envParams.nos.__CORE.encryption.addInstance("AES256", "AES256", "Bismillah411");

  envParams.nos.__CORE.encryption.addInstance("none", "none");
  envParams.nos.__CORE.encryption.addInstance("RSA", "RSA");
  envParams.nos.__CORE.encryption.addInstance(
    "chacha20-poly1305",
    "chacha20-poly1305",
    envParams.nos.sysConfig.chacha20poly.key
  );
  envParams.nos.__CORE.encryption.addInstance(
    "chacha20-poly1305-comm1",
    "chacha20-poly1305",
    envParams.nos.sysConfig.chacha20poly.esp32key
  );
  envParams.nos.__CORE.encryption.setSecurityAgent(
    envParams.mqtnlDriver,
    "none"
  );
  envParams.nos.__CORE.encryption.setSecurityAgent(
    envParams.mqtnlDriver2,
    "chacha20-poly1305-comm1"
  );
  envParams.nos.__CORE.encryption.setSecurityAgent(
    envParams.mqtnlDriver3,
    "AES256"
  );
};
