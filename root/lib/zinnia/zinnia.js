class Zinnia {
  constructor() {
    this.version = "0.01";
    this.dataElements = {};
  }

  createElement(tag, id = null, classes = [], attributes = {}) {
    const element = document.createElement(tag);
    if (id) element.id = id;
    if (classes.length > 0) element.classList.add(...classes);
    for (const key in attributes) {
      if (attributes.hasOwnProperty(key)) {
        element.setAttribute(key, attributes[key]);
        if (key.startsWith("data-")) {
          const dataKey = attributes[key];
          if (!this.dataElements[dataKey]) {
            this.dataElements[dataKey] = [];
          }
          this.dataElements[dataKey].push(element);
        }
      }
    }
    return element;
  }

  getElementByData(key, value, containerUuid = null) {
    let elements = this.dataElements[value] || [];
    if (containerUuid) {
      const container = document.querySelector(
        `[data-uuid="${containerUuid}"]`
      );
      if (container) {
        elements = elements.filter(
          (el) => container.contains(el) && el.getAttribute(key) === value
        );
        return elements[0] || null;
      }
      return null;
    }
    return elements.find((el) => el.getAttribute(key) === value) || null;
  }

  getElementsByData(key, value, containerUuid = null) {
    let elements = this.dataElements[value] || [];
    if (containerUuid) {
      const container = document.querySelector(
        `[data-uuid="${containerUuid}"]`
      );
      if (container) {
        return (
          elements.filter(
            (el) => container.contains(el) && el.getAttribute(key) === value
          ) || []
        );
      }
      return [];
    }
    return elements.filter((el) => el.getAttribute(key) === value) || [];
  }

  createContainer(containerElement, dataUuid) {
    const container = containerElement;
    if (dataUuid) {
      container.setAttribute("data-uuid", dataUuid);
    }

    return {
      element: container,
      addRow: (extraClasses = []) => {
        const row = this.createElement("div", null, ["row", ...extraClasses]);
        container.appendChild(row);
        return {
          element: row,
          addCol: (
            cols = 12,
            title = null,
            extraClasses = [],
            dataId = null
          ) => {
            const colAttributes = dataId ? { "data-id": dataId } : {};
            const colClass = `col-md-${cols}`;
            const finalClasses = [
              ...extraClasses,
              colClass,
              "square",
              "p-3",
              "border",
            ];
            const col = this.createElement(
              "div",
              null,
              finalClasses,
              colAttributes
            ); // Gabungkan semua class
            if (title) {
              const titleBar = this.createElement("h6", null, [
                "mb-3",
                "border-bottom",
                "pb-2",
              ]);
              titleBar.textContent = title;
              col.appendChild(titleBar);
            }
            row.appendChild(col);
            return col;
          },
        };
      },
      append: (childElement, dataId = null) => {
        if (dataId) {
          childElement.setAttribute("data-id", dataId);
          const dataKey = dataId;
          if (!this.dataElements[dataKey]) {
            this.dataElements[dataKey] = [];
          }
          this.dataElements[dataKey].push(childElement);
        }
        container.appendChild(childElement);
      },
    };
  }

  createButton(
    text,
    id,
    color = "primary",
    extraClasses = [],
    onClick,
    dataId = null
  ) {
    const attributes = dataId ? { "data-id": dataId } : {};
    const buttonClasses = ["btn", `btn-${color}`, ...extraClasses];
    const button = this.createElement("button", id, buttonClasses, {
      type: "button",
      ...attributes,
    });
    button.textContent = text;
    if (onClick && typeof onClick === "function") {
      button.addEventListener("click", onClick);
    }
    return button;
  }

  createInputText(id, placeholder, extraClasses = [], dataId = null) {
    const attributes = dataId ? { "data-id": dataId } : {};
    const inputClasses = ["form-control", ...extraClasses];
    return this.createElement("input", id, inputClasses, {
      type: "text",
      placeholder: placeholder,
      ...attributes,
    });
  }

  createTextArea(id, placeholder, rows = 3, extraClasses = [], dataId = null) {
    const attributes = dataId ? { "data-id": dataId } : {};
    const textareaClasses = ["form-control", ...extraClasses];
    return this.createElement("textarea", id, textareaClasses, {
      placeholder: placeholder,
      rows: rows,
      ...attributes,
    });
  }

  createSelect(id, options = [], extraClasses = [], onChange, dataId = null) {
    const attributes = dataId ? { "data-id": dataId } : {};
    const selectClasses = ["form-select", ...extraClasses];
    const select = this.createElement("select", id, selectClasses, attributes);
    options.forEach((optionData) => {
      const option = this.createElement("option", null, [], {
        value: optionData.value,
      });
      option.textContent = optionData.label;
      select.appendChild(option);
    });
    if (onChange && typeof onChange === "function") {
      select.addEventListener("change", onChange);
    }
    return select;
  }

  createRadio(
    name,
    value,
    labelText,
    id,
    extraClasses = [],
    onChange,
    dataId = null
  ) {
    const attributes = dataId ? { "data-id": dataId } : {};
    const radioContainer = this.createElement("div", null, [
      "form-check",
      ...extraClasses,
    ]);
    const radioInput = this.createElement("input", id, ["form-check-input"], {
      type: "radio",
      name: name,
      value: value,
      ...attributes,
    });
    const radioLabel = this.createElement("label", null, ["form-check-label"], {
      for: id,
    });
    radioLabel.textContent = labelText;

    radioContainer.appendChild(radioInput);
    radioContainer.appendChild(radioLabel);

    if (onChange && typeof onChange === "function") {
      radioInput.addEventListener("change", onChange);
    }

    return radioContainer;
  }

  createCheckbox(
    name,
    value,
    labelText,
    id,
    extraClasses = [],
    onChange,
    dataId = null
  ) {
    const attributes = dataId ? { "data-id": dataId } : {};
    const checkboxContainer = this.createElement("div", null, [
      "form-check",
      ...extraClasses,
    ]);
    const checkboxInput = this.createElement(
      "input",
      id,
      ["form-check-input"],
      { type: "checkbox", name: name, value: value, ...attributes }
    );
    const checkboxLabel = this.createElement(
      "label",
      null,
      ["form-check-label"],
      { for: id }
    );
    checkboxLabel.textContent = labelText;

    checkboxContainer.appendChild(checkboxInput);
    checkboxContainer.appendChild(checkboxLabel);

    if (onChange && typeof onChange === "function") {
      checkboxInput.addEventListener("change", onChange);
    }

    return checkboxContainer;
  }

  createMap(
    containerElement,
    apiKey,
    latitude,
    longitude,
    zoom = 10,
    dataId = null
  ) {
    const attributes = dataId ? { "data-id": dataId } : {};
    const mapDiv = this.createElement(
      "div",
      null,
      ["rounded", "p-3", "border"],
      { style: "height: 400px;", ...attributes }
    );
    containerElement.appendChild(mapDiv);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
    script.async = true;
    script.defer = true;
    window.initMap = () => {
      const map = new google.maps.Map(mapDiv, {
        center: { lat: latitude, lng: longitude },
        zoom: zoom,
      });
      new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: map,
      });
    };
    document.head.appendChild(script);
    return mapDiv;
  }

  createChart(
    containerElement,
    chartData,
    title = "",
    type = "bar",
    dataId = null,
    userOptions = {}
  ) {
    const attributes = dataId ? { "data-id": dataId } : {};
    const chartDiv = this.createElement(
      "div",
      null,
      ["rounded", "p-3", "border"],
      { style: "height: 100%;", ...attributes }
    );
    containerElement.appendChild(chartDiv);

    const canvas = this.createElement("canvas", null, [], attributes);
    chartDiv.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    new Chart(ctx, {
      type: type,
      data: {
        labels: chartData.labels,
        datasets: chartData.datasets,
      },
      options: {
        ...userOptions,
        responsive: true,
        plugins: {
          title: {
            display: title !== "",
            text: title,
            font: {
              size: 16,
            },
          },
          legend: {
            position: "bottom",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
    return chartDiv;
  }

  createAlert(message, type = "success", dataId = null) {
    const attributes = dataId ? { "data-id": dataId } : {};
    const alertDiv = this.createElement(
      "div",
      null,
      ["alert", `alert-${type}`, "alert-dismissible", "fade", "show"],
      { role: "alert", ...attributes }
    );
    alertDiv.textContent = message;

    const closeButton = this.createElement("button", null, ["btn-close"], {
      type: "button",
      "data-bs-dismiss": "alert",
      "aria-label": "Close",
    });
    closeButton.addEventListener("click", () => {
      alertDiv.remove();
    });
    alertDiv.appendChild(closeButton);

    setTimeout(() => {
      alertDiv.classList.remove("show");
      alertDiv.addEventListener(
        "transitionend",
        () => {
          alertDiv.remove();
        },
        { once: true }
      );
    }, 5000);

    return alertDiv;
  }

  createLabel(id, text, extraClasses = [], dataId = null) {
    const attributes = dataId ? { "data-id": dataId } : {};
    const labelClasses = ["form-label", ...extraClasses];
    const label = this.createElement("label", id, labelClasses, attributes);
    label.textContent = text;
    return label;
  }
}
