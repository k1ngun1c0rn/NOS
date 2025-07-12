// zininademo.js - Demo showcase semua komponen Zinnia
module.exports = {
  application: (uuid) => {
    const appName = 'zininademo';
    const appTitle = 'Zinnia Demo';
    return {
      header: {
        appName,
        appTitle,
        uuid,
        active: true,
        iconSmall: "icon_16_app.png",
        iconMedium: "icon_22_app.png",
        iconLarge: "icon_32_app.png",
        resizable: true,
        width: 650,
        height: 500,
      },
      content: `
        <style>
          .zinnia-demo-container[data-uuid="${uuid}"] {
            padding: 20px;
            /*background-color: #f8f9fa;
            border-radius: 5px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);*/
            height: 100%; /* Set tinggi container menjadi 100% dari tinggi parentnya*/
            display: flex; /* Tambahkan ini */
            flex-direction: column; /* Tambahkan ini */
          }
        </style>
        <div class="zinnia-demo-container" data-app="${appName}" data-uuid="${uuid}"></div>`
      ,
      main: () => { },
      jsContent: (app) => {
        const appUuid = app.header.uuid;
        const parentSelector = `.zinnia-demo-container[data-uuid="${appUuid}"]`;

        const dom = new Zinnia();

        const existingContainer = document.querySelector(parentSelector);
        if (!existingContainer) {
          console.error(
            "Container dengan class .zinnia-demo-container tidak ditemukan!",
          );
          return;
        }

        const appContainer = dom.createContainer(existingContainer, appUuid);

        // Layout Grid Utama dengan Title
        const mainRow = appContainer.addRow();
        // const row2 = appContainer.addRow();

        // const col1 = mainRow.addCol(6, "Form Input", ['h-100'], 'form-input-col'); // Tambahkan h-100
        // const col2 = mainRow.addCol(6, "Actions", ['h-100'], 'actions-col');     // Tambahkan h-100

        const col1 = mainRow.addCol(4, "Form Input", ['h-100'], "form-input-col");
        const col2 = mainRow.addCol(8, "Chart", ['h-100'], "actions-col");

        // const colchart = row2.addCol(12, "Chart", ['h-30'], "actions-col");

        // const mapDiv = dom.createMap(col2, '', -6.2088, 106.8456, 11, 'jakarta-map'); // Ganti YOUR_API_KEY
        // if (mapDiv) {
        //   console.log('Google Map berhasil ditambahkan ke dalam container:', mapDiv);
        // }

        // Tambahkan Chart
        const chartData = {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
          datasets: [{
            label: 'Data Penjualan',
            data: [65, 59, 80, 81, 56, 55, 40],
            backgroundColor: [
              'rgba(255, 99, 132, 0.2)',
              'rgba(54, 162, 235, 0.2)',
              'rgba(255, 206, 86, 0.2)',
              'rgba(75, 192, 192, 0.2)',
              'rgba(153, 102, 255, 0.2)',
              'rgba(255, 159, 64, 0.2)',
              'rgba(255, 0, 0, 0.2)'
            ],
            borderColor: [
              'rgba(255, 99, 132, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
              'rgba(255, 159, 64, 1)',
              'rgba(255, 0, 0, 1)'
            ],
            borderWidth: 1
          }]
        };
        const chartDiv = dom.createChart(col2, chartData, 'Penjualan Bulanan', 'bar', 'sales-chart');
        if (chartDiv) {
          console.log('Chart berhasil ditambahkan ke dalam container:', chartDiv);
        }

        // Komponen Form di Kolom 1
        const nameInput = dom.createInputText(
          null,
          "Masukkan nama",
          [],
          "name-input",
        );
        col1.appendChild(nameInput);

        const messageTextArea = dom.createTextArea(
          null,
          "Tulis pesan Anda",
          3,
          ["mt-2"],
          "message-area",
        );
        col1.appendChild(messageTextArea);

        const options = [
          { value: "option1", label: "Pilihan 1" },
          { value: "option2", label: "Pilihan 2" },
          { value: "option3", label: "Pilihan 3" },
        ];
        const selectOptions = dom.createSelect(
          null,
          options,
          ["mt-2"],
          (event) => {
            console.log("Opsi dipilih:", event.target.value);
          },
          "select-option",
        );
        col1.appendChild(selectOptions);

        const radioGroup = dom.createElement('div', null, ['mt-3', 'd-flex', 'flex-wrap']); // Menggunakan flexbox untuk layout 2 kolom
        radioGroup.appendChild(dom.createRadio("gender", "male", "Laki-laki", "radio-male", ['me-3'], null, 'radio-male')); // margin right
        radioGroup.appendChild(dom.createRadio("gender", "female", "Perempuan", "radio-female", [], null, 'radio-female'));
        col1.appendChild(radioGroup);

        const checkboxGroup = dom.createElement("div", null, []);
        checkboxGroup.appendChild(
          dom.createCheckbox(
            "hobbies",
            "coding",
            "Coding",
            "checkbox-coding",
            [],
            null,
            "checkbox-coding",
          ),
        );
        checkboxGroup.appendChild(
          dom.createCheckbox(
            "hobbies",
            "reading",
            "Membaca",
            "checkbox-reading",
            [],
            null,
            "checkbox-reading",
          ),
        );
        col1.appendChild(checkboxGroup);

        // Komponen Lain di Kolom 2
        const submitButton = dom.createButton(
          "Submit Form",
          null,
          "primary",
          ["mt-3"],
          () => {
            const nameInputEl = dom.getElementByData(
              "data-id",
              "name-input",
              appUuid,
            );
            const messageTextAreaEl = dom.getElementByData(
              "data-id",
              "message-area",
              appUuid,
            );
            const selectOptionsEl = dom.getElementByData(
              "data-id",
              "select-option",
              appUuid,
            );

            const nameValue = nameInputEl ? nameInputEl.value : "";
            const messageValue = messageTextAreaEl
              ? messageTextAreaEl.value
              : "";
            const selectedOption = selectOptionsEl ? selectOptionsEl.value : "";

            // Ambil nilai gender yang dipilih
            const genderRadios = document.querySelectorAll(
              `[data-uuid="${appUuid}"] input[name="gender"]:checked`,
            );
            const selectedGender =
              genderRadios.length > 0 ? genderRadios[0].value : "Tidak dipilih";

            // Ambil nilai hobbies yang dicentang
            const hobbiesCheckboxes = document.querySelectorAll(
              `[data-uuid="${appUuid}"] input[name="hobbies"]:checked`,
            );
            const selectedHobbies = Array.from(hobbiesCheckboxes).map(
              (checkbox) => checkbox.value,
            );
            const hobbiesText =
              selectedHobbies.length > 0
                ? selectedHobbies.join(", ")
                : "Tidak ada yang dipilih";

            const alertMessage = `Data yang diinput:\nNama: ${nameValue}\nPesan: ${messageValue}\nPilihan: ${selectedOption}\nJenis Kelamin: ${selectedGender}\nHobi: ${hobbiesText}`;
            const successAlert = dom.createAlert(
              alertMessage,
              "info",
              "submit-alert",
            );
            appContainer.element.prepend(successAlert);

            // Optional: Bersihkan form setelah submit
            const appContainerEl = document.querySelector(
              `[data-uuid="${appUuid}"]`,
            );
            if (appContainerEl) {
              const nameInputReset = appContainerEl.querySelector(
                '[data-id="name-input"]',
              );
              const messageTextAreaReset = appContainerEl.querySelector(
                '[data-id="message-area"]',
              );
              const selectOptionsReset = appContainerEl.querySelector(
                '[data-id="select-option"]',
              );

              if (nameInputReset) nameInputReset.value = "";
              if (messageTextAreaReset) messageTextAreaReset.value = "";
              if (selectOptionsReset) selectOptionsReset.selectedIndex = 0;
              appContainerEl
                .querySelectorAll('input[name="gender"]')
                .forEach((radio) => (radio.checked = false));
              appContainerEl
                .querySelectorAll('input[name="hobbies"]')
                .forEach((checkbox) => (checkbox.checked = false));
            }
          },
          "submit-button",
        );
        col1.appendChild(submitButton);

        // Contoh Penggunaan getElementByData dengan scope
        const nameInputElement = dom.getElementByData(
          "data-id",
          "name-input",
          appUuid,
        );
        if (nameInputElement) {
          console.log(
            "Elemen input nama ditemukan di container:",
            nameInputElement,
          );
        }
      },
    };
  },
};
