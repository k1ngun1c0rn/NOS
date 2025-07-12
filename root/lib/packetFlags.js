// NOS PacketHeaderFlag Constants - V1.0

module.exports = {
  // Ping & Discovery
  FLAG_PING_REQUEST: 1,
  FLAG_PING_REPLY: 2,
  FLAG_BROADCAST_PING: 3,
  FLAG_BROADCAST_REPLY: 4,

  // Security Handshake
  FLAG_SECURITY_HANDSHAKE_REQ: 10,
  FLAG_SECURITY_NONE: 11,
  FLAG_SECURITY_AES256: 12,
  FLAG_SECURITY_CHACHA20: 13,
  FLAG_SECURITY_CHACHA20_POLY: 14,
  //.
  //.
  //FLAG_SECURITY_XX 20
  FLAG_RSA_KEY_EXCHANGE_HANDSHAKE_GUEST_REQUEST: 50, // guest menginisiasi proses pertukaran key, dan mengirim pubkey dirinya
  FLAG_RSA_KEY_EXCHANGE_HANDSHAKE_HOST_RESPONSE_PUBKEY: 51, // host merespon dengan menirim pubkeynya
  FLAG_RSA_KEY_EXCHANGE_HANDSHAKE_GUEST_SEND_SECRET_KEY: 52, // guest mengirim secret key chacha20-poly1305
  FLAG_RSA_KEY_EXCHANGE_HANDSHAKE_DONE: 53, // guest mengirim secret key chacha20-poly1305
  FLAG_RSA_KEY_EXCHANGE_TUNNEL_LOGIN: 60, // guest mengirim secret key chacha20-poly1305
  FLAG_RSA_KEY_EXCHANGE_TUNNEL_LOGIN_RESPONSE: 61, // guest mengirim secret key chacha20-poly1305

  // File Transfer (101–500)
  FLAG_FILE_PUT_SUCCESS: 110,
  FLAG_FILE_HEADER_INFO: 111,
  FLAG_FILE_HEADER_GETFILE: 112,
  FLAG_FILE_PAYLOAD_GETFILE: 113,
  FLAG_FILE_LIST_RESPONSE: 114,
  FLAG_FILE_PUT_PROGRESS: 115,
  FLAG_FILE_SENDING: 116,
  flagToAgentName: (flag) => {
    switch (flag) {
      case 11: return "none";
      case 12: return "AES256";
      case 13: return "ChaCha20";
      case 14: return "chacha20-poly1305";
      default: return null;
    }
  },
  agentNameToFlag: (name) => {
    switch (name) {
      case "none": return 11;
      case "AES256": return 12;
      case "ChaCha20": return 13;
      case "chacha20-poly1305": return 14;
      default: return 11;
    }
  }

  // User space (501–1000) bisa ditambahkan sendiri oleh programmer


  // Reserved Range
  // 1–100   → Untuk semua network handshake / meta komunikasi
  // 101–500 → File transfer protocol
  // 501–1000→ User space
  // 1001+   → Future reserved
};
