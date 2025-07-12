class SimpleTextEditor {
    constructor(content, stdout) {
        content = content.replaceAll("\t", "  ");
        this.version = "1.5";
        this.lines = content ? content.split("\n") : [""];
        this.cursorX = 0;
        this.cursorY = 0;
        this.offsetY = 0;
        this.screenHeight = stdout.rows - 0;
        this.stdout = stdout;
        this.monoPos = 0;
        this.changed = false;

        this.wrapLines();
        this.render();
    }

    keyboardFeeder(str, key) {
        // console.log("ccc "+JSON.stringify(key));
        if (key.ctrl && key.name === "w") {
            this.changed = false;
            this.saveAndExit();
            if (this.onExit) this.onExit();
        } else if ((key.ctrl && key.name === "s") || (key.ctrl && key.name == "\x00" && key.sequence == "\x13")) {
            this.changed = false;
            this.save();
        } else if ((key.ctrl && key.name === "c") || (key.ctrl && key.name == "\x03" && key.sequence == "\x03")) {
            this.Exit();
            if (this.onExit) this.onExit();
        } else {
            this.handleKeyPress(key);
        }
    }

    wrapLines() {
        const screenWidth = this.stdout.columns;
        const wrappedLines = [];

        this.lines.forEach((line) => {
            while (line.length > screenWidth) {
                wrappedLines.push(line.slice(0, screenWidth));
                line = line.slice(screenWidth);
            }
            wrappedLines.push(line);
        });

        this.lines = wrappedLines;
    }

    scrollUpAndAppendLine(newTopLine) {
        this.stdout.write("\x1b[1;" + this.screenHeight + "r");
        this.stdout.write("\x1b[" + this.screenHeight + ";1H\x1b[S");
        this.stdout.write("\x1b[1;1H\x1b[2K" + newTopLine);
    }

    scrollDownAndPrependLine(newBottomLine) {
        this.stdout.write("\x1b[1;" + this.screenHeight + "r");
        this.stdout.write("\x1b[1;1H\x1b[T");
        this.stdout.write(`\x1b[${this.screenHeight};1H\x1b[2K` + newBottomLine);
    }

    handleKeyPress(key) {
        const screenWidth = this.stdout.columns;
        const screenHeight = this.stdout.rows - 1;
        const currentLine = this.lines[this.cursorY + this.offsetY];
        //console.log(JSON.stringify(key));
        if ([',', '.', '/', ';', '\'', '[', ']', '-', '=', '<', '>', '?', ':', '"',
            '{', '}', '_', '+', '\\', '|', '!', '@', '#', '$', '%', '^', '&', '*',
            '(', ')'].filter((a) => a == key.sequence).length > 0) key.name = key.sequence;

        if (key.sequence == "\x1B[A") key.name = "up";
        else if (key.sequence == "\x1B[B") key.name = "down";
        else if (key.sequence == "\x1B[C") key.name = "right";
        else if (key.sequence == "\x1B[D") key.name = "left";
        else if (key.sequence == "\x1B[H") key.name = "home";
        else if (key.sequence == "\x1B[F") key.name = "end";
        else if (key.sequence == "\r") key.name = "return";
        else if (key.name.charCodeAt(0) == 127) key.name = "backspace";



        switch (key.name) {

            case "up":
                if (this.cursorY > 0) {
                    this.cursorY--;
                } else if (this.offsetY > 0) {
                    this.offsetY--;
                    const prevLine = this.lines[this.offsetY] || "";
                    this.scrollDownAndPrependLine(prevLine);
                }
                this.cursorX = Math.min(this.monoPos, this.lines[this.cursorY + this.offsetY].length);
                break;

            case "down":
                if (this.cursorY < screenHeight - 1 && this.cursorY + this.offsetY < this.lines.length - 1) {
                    this.cursorY++;
                } else if (this.offsetY + screenHeight < this.lines.length) {
                    this.offsetY++;
                    const nextLine = this.lines[this.offsetY + screenHeight - 1] || "";
                    this.scrollUpAndAppendLine(nextLine);
                }
                this.cursorX = Math.min(this.monoPos, this.lines[this.cursorY + this.offsetY].length);
                break;

            case "left":
                if (this.cursorX > 0) {
                    this.cursorX--;
                } else if (this.cursorY > 0) {
                    this.cursorY--;
                    this.cursorX = this.lines[this.cursorY + this.offsetY].length;
                }
                this.monoPos = this.cursorX;
                break;

            case "right":
                if (this.cursorX < currentLine.length) {
                    this.cursorX++;
                } else if (this.cursorY + this.offsetY < this.lines.length - 1) {
                    this.cursorY++;
                    this.cursorX = 0;
                }
                this.monoPos = this.cursorX;
                break;

            case "home":
                this.cursorX = 0;
                this.monoPos = this.cursorX;
                break;

            case "end":
                this.cursorX = currentLine.length;
                this.monoPos = this.cursorX;
                break;

            case "return": {
                const currentLine = this.lines[this.cursorY + this.offsetY];
                this.lines.splice(this.cursorY + this.offsetY + 1, 0, currentLine.slice(this.cursorX));
                this.lines[this.cursorY + this.offsetY] = currentLine.slice(0, this.cursorX);
                this.cursorX = 0;
                this.cursorY++;
                this.monoPos = this.cursorX;
                this.wrapLines();
                this.render();
                return;
            }

            case "backspace": {
                if (this.cursorX > 0) {
                    const line = this.lines[this.cursorY + this.offsetY];
                    this.lines[this.cursorY + this.offsetY] = line.slice(0, this.cursorX - 1) + line.slice(this.cursorX);
                    this.cursorX--;
                } else if (this.cursorY + this.offsetY > 0) {
                    const prevLine = this.lines[this.cursorY + this.offsetY - 1];
                    this.cursorX = prevLine.length;
                    this.lines[this.cursorY + this.offsetY - 1] += this.lines[this.cursorY + this.offsetY];
                    this.lines.splice(this.cursorY + this.offsetY, 1);
                    if (this.cursorY > 0) {
                        this.cursorY--;
                    } else {
                        this.offsetY--;
                    }
                }
                this.monoPos = this.cursorX;
                this.wrapLines();
                this.render();
                return;
            }

            default:
                if (key.sequence && key.sequence.length === 1) {
                    if (key.sequence.charCodeAt(0) >= 32 && key.sequence.charCodeAt(0) <= 128)
                        this.changed = true;
                    const line = this.lines[this.cursorY + this.offsetY];
                    if (line.length >= screenWidth) {
                        const wrapped = line.slice(0, screenWidth);
                        const remaining = line.slice(screenWidth);
                        this.lines[this.cursorY + this.offsetY] = wrapped;
                        this.lines.splice(this.cursorY + this.offsetY + 1, 0, remaining);
                        this.cursorY++;
                        this.cursorX = 0;
                        this.monoPos = this.cursorX;
                    } else {
                        this.lines[this.cursorY + this.offsetY] = line.slice(0, this.cursorX) + key.sequence + line.slice(this.cursorX);
                        this.cursorX++;
                        this.monoPos = this.cursorX;
                    }
                }
                break;
        }

        this.wrapLines();
        this.render();
    }

    render() {
        const visibleLines = this.lines.slice(this.offsetY, this.offsetY + this.screenHeight);
        const screenWidth = this.stdout.columns;

        this.stdout.write(`\u001B[?25l`);
        for (let i = 0; i < this.screenHeight; i++) {
            const line = visibleLines[i] || "";
            this.stdout.write(`\x1b[${i + 1};1H\x1b[2K`);
            this.stdout.write(line);
        }

        this.stdout.write(`\x1b[${this.cursorY + 1};${this.cursorX + 1}H`);
        this.stdout.write(`\u001B[?25h`);
    }

    saveAndExit() {
        this.stdout.write("\x1b[2J\x1b[H");
        this.stdout.write("File saved. Exiting...\n");
    }
    save() { }
    Exit() {
        this.stdout.write("\x1b[2J\x1b[H");
        if (this.changed == true)
            console.log("Exiting without save...");
    }
}

module.exports = { SimpleTextEditor }