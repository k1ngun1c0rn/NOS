module.exports = {
  sysloggerInit: function (os, filename) {
    let success = 1;
    this.name = "syslogger";
    this.os = os;
    this.version = 0.01;
    this.devClass = "System Logger";
    this.filename = filename;

    // fs = require('fs')

    this.ready = function () {
      if (success) return 1;
      else return 0;
    };

    this.append = (message, level = 0) => {
      let y, m, d, H, i, s;
      let dt = new Date();
      y = dt.getFullYear();
      m = dt.getMonth() + 1;
      d = dt.getDate();
      h = dt.getHours();
      i = dt.getMinutes();
      s = dt.getSeconds();

      let ts =
        y +
        "" +
        (m < 10 ? "0" + m : m) +
        "" +
        (d < 10 ? "0" + d : d) +
        " " +
        (h < 10 ? "0" + h : h) +
        "" +
        (i < 10 ? "0" + i : i) +
        "" +
        (s < 10 ? "0" + s : s);

      fs.appendFileSync(
        this.filename,
        ts + "|" + level + "|" + message + "\r\n",
      );
    };

    success = 1;
  },
};
