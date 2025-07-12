// ============================================
// sysconfigFormatter.js - Standard formatter untuk sysconfig.js di NOS
// ============================================

function formatObjectToHex(obj, indentLevel = 0) {
  const indent = "  ".repeat(indentLevel);
  if (Array.isArray(obj)) {
    const hexArray = obj.map(
      (v) => "0x" + v.toString(16).padStart(2, "0").toUpperCase()
    );
    let lines = [];
    for (let i = 0; i < hexArray.length; i += 8) {
      lines.push(indent + "  " + hexArray.slice(i, i + 8).join(", "));
    }
    return "[\n" + lines.join(",\n") + "\n" + indent + "]";
  } else {
    return String(obj);
  }
}

function formatSysConfig(obj, indentLevel = 0) {
  const indent = "  ".repeat(indentLevel);

  if (Array.isArray(obj)) {
    if (obj.every((item) => typeof item === "number")) {
      return formatObjectToHex(obj, indentLevel);
    } else {
      const entries = obj.map((v) => formatSysConfig(v, indentLevel + 1));
      return (
        "[\n" +
        entries.map((e) => indent + "  " + e).join(",\n") +
        "\n" +
        indent +
        "]"
      );
    }
  } else if (typeof obj === "object" && obj !== null) {
    const entries = Object.entries(obj).map(([k, v]) => {
      return indent + "  " + k + ": " + formatSysConfig(v, indentLevel + 1);
    });
    return "{\n" + entries.join(",\n") + "\n" + indent + "}";
  } else if (typeof obj === "string") {
    return JSON.stringify(obj);
  } else {
    return String(obj);
  }
}

module.exports = {
  formatSysConfig,
  formatObjectToHex,
};
