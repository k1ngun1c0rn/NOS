module.exports = {
  name: "lsdev",
  description: "List all mounted devices",
  version: "1.0",
  needRoot: true,
  main: function (nos) {
    const icons = {
      "System Logger": "📝",
      Display: "🖥️ ",
      Keyboard: "⌨️ ",
      "File Access": "📁",
      "Web Socket": "🌐",
      "TTY Moderator": "🎛️ ",
      "HTTP Server": "🛰️",
      "Connection Manager": "📡",
      "Sensor Manager": "📶",
      default: "🔧",
    };

    function similarityScore(str1, str2) {
      str1 = str1.toLowerCase();
      str2 = str2.toLowerCase();

      const set1 = new Set(str1.split(/\s+/));
      const set2 = new Set(str2.split(/\s+/));

      const intersection = new Set([...set1].filter((x) => set2.has(x)));
      const union = new Set([...set1, ...set2]);

      return intersection.size / union.size;
    }

    function getDeviceIcon(devClass) {
      const defaultIcon = icons["default"];
      let bestMatch = defaultIcon;
      let bestScore = 0;

      for (const key in icons) {
        const score = similarityScore(devClass, key);
        if (score > bestScore && score >= 0.6) {
          bestScore = score;
          bestMatch = icons[key];
        }
      }

      return bestMatch;
    }

    function visualWidth(str) {
      let width = 0;
      for (let i = 0; i < str.length; i++) {
        const code = str.codePointAt(i);
        if (
          (code >= 0x1f300 && code <= 0x1faff) || // emoji
          (code >= 0x2000 && code <= 0x206f)
        ) {
          width += 2;
          if (code > 0xffff) i++; // skip surrogate pair
        } else {
          width += 1;
        }
      }
      return width;
    }

    function padRightVisual(str, totalWidth) {
      const current = visualWidth(str);
      return str + " ".repeat(Math.max(0, totalWidth - current));
    }

    nos.devices.forEach((x) => {
      // const devClass = x.devClass;
      // let icon = icons["default"];

      // for (const key in icons) {
      //   if (devClass === key || devClass.startsWith(key)) {
      //     icon = icons[key];
      //     break;
      //   }
      // }

      // const icon = icons[x.devClass] || icons["default"];

      icon = getDeviceIcon(x.devClass);
      const label = `${icon} ${x.name}`;
      const padded = padRightVisual(label, 22); // Adjust width as needed
      this.crt.write(
        `${padded}\t:: ${x.devClass}${x.cryptoName ? " [" + x.cryptoName + "]" : ""}\n`,
      );
    });
    this.shell.terminate();
  },
};
