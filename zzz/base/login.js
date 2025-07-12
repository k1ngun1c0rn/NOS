module.exports = {
  name: "login",
  version: "1.5",
  needRoot: true,
  main: async function (nos) {
    const sacredPhrases = bfs.require("/lib/sacredPhrases.js");
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      const username = await this.shell.userPrompt("Username: ", true);
      const passwd = await this.shell.userPrompt("Password: 🔑", false);

      const phrase = sacredPhrases[Math.floor(Math.random() * sacredPhrases.length)];
      const loginCheck = this.shell.checkLogin(username, passwd);

      if (loginCheck != null) {
        this.shell.rootActive = (loginCheck.userType === "root");
        this.shell.username = username;
        this.crt.write(`\n:: ${this.shell.version} ::\n`);
        this.crt.write(`"${phrase}" \n\n`);
        this.shell.terminate();
        return;
      } else {
        attempts++;
        if (attempts < maxAttempts) {
          this.crt.textOut(`\n-- Access Denied! (${attempts}/${maxAttempts}) --\n`);
        }
      }
    }
    this.crt.textOut("\n-- Access Denied! Maximum login attempts reached. --\n");
    nos.shutdown(0);
  }
};
