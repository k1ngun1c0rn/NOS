__APP.transportLayer = {
  defaultProtocol: "mqtt",
  protocols: [
    {
      name: "mqtt",
      lib: require("mqtt"),
      ip: "mqtt://192.168.0.105",
      // ip: "mqtt://62.72.31.252",
      // ip: "mqtt://broker.hivemq.com",
      // ip: "mqtt://broker.emqx.io",
      // ip: "mqtt://localhost",
      port: 1883,
    },
    {
      name: "beeNet",
      lib: bfs.require("/lib/beeNetClient"),
      ip: "localhost",
      port: 1884,
    },
  ],
};

//PLACE THIS AT THE BOTTOM
__APP.transportLayer.defaultProtocol = __APP.transportLayer.protocols.find(
  (item) => item.name === __APP.transportLayer.defaultProtocol
);
