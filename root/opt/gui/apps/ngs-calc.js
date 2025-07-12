// ngs-calc.js - Kalkulator sederhana dengan Zinnia UI Abstraction
module.exports = {
  application: (uuid) => {
    const appName = 'ngs-calc';
    const appTitle = 'Kalkulator';
    return {
      header: {
        appName,
        appTitle,
        uuid,
        active: true,
        iconSmall: "icon_16_star.png",
        iconMedium: "icon_22_star.png",
        iconLarge: "icon_32_app.png",
        resizable: true,
        width: 240,
        height: 400,
      },
      content: `
        <style>
          .ngs-calc-container[data-uuid="${uuid}"] {
            padding: 20px;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
        </style>
        <div class="ngs-calc-container" data-app="${appName}" data-uuid="${uuid}"></div>`
      ,
      main: () => { },
      jsContent: (app) => {
        const uuid = app.header.uuid;
        const parentSelector = `.ngs-calc-container[data-uuid="${uuid}"]`;
        const parent = document.querySelector(parentSelector);
        const dom = new Zinnia();

        // Buat container utama
        const container = dom.createContainer(parent, uuid);

        // Hapus elemen lama (Operand A, Operand B, dan Dropdown Operator)
        container.innerHTML = "";

        // Layar Kalkulator
        const screen = dom.createInputText(
          null,
          "",
          ["form-control", "mb-3", "text-end"],
          "calc-screen"
        );
        screen.readOnly = true;
        container.append(screen);

        // Tombol Angka dan Operator dalam Layout Matriks
        const buttons = [
          ["7", "8", "9", "/"],
          ["4", "5", "6", "*"],
          ["1", "2", "3", "-"],
          ["C", "0", "=", "+"],
          ["CE", "%", "x^2", "sqrt"]
        ];

        // Tambahkan tombol % di baris bawah
        // buttons.push(["%"]);

        const buttonContainer = dom.createElement("div", null, ["d-grid", "gap-2"]);
        // Perbarui layout tombol agar lebih rapi
        buttonContainer.innerHTML = "";
        buttons.forEach((row) => {
          const rowDiv = dom.createElement("div", null, ["d-flex", "justify-content-between"]);
          row.forEach((btn) => {
            const button = dom.createButton(
              btn,
              null,
              "secondary",
              ["btn", "btn-secondary", "flex-fill", "m-1"],
              () => {
                if (btn === "=") {
                  try {
                    screen.value = eval(screen.value);
                  } catch {
                    screen.value = "Error";
                  }
                } else if (btn === "C") {
                  screen.value = "";
                } else if (btn === "CE") {
                  screen.value = screen.value.slice(0, -1);
                } else if (btn === "x^2") {
                  try {
                    screen.value = Math.pow(parseFloat(screen.value), 2).toString();
                  } catch {
                    screen.value = "Error";
                  }
                } else if (btn === "sqrt") {
                  try {
                    screen.value = Math.sqrt(parseFloat(screen.value)).toString();
                  } catch {
                    screen.value = "Error";
                  }
                } else if (btn === "%") {
                  try {
                    screen.value = (parseFloat(screen.value) / 100).toString();
                  } catch {
                    screen.value = "Error";
                  }
                } else {
                  screen.value += btn;
                }
              }
            );
            rowDiv.appendChild(button);
          });
          buttonContainer.appendChild(rowDiv);
        });
        container.append(buttonContainer);
      },
    };
  },
};