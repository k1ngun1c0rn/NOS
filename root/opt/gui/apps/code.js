module.exports = {
  application: () => {
    let appName = "code";
    let appTitle = "Code Editor";

    return {
      header: {
        appName,
        appTitle,
        active: true,
        iconSmall: "icon_16_editor.png",
        iconMedium: "icon_22_editor.png",
        iconLarge: "icon_32_editor.png",
        width: 900,
        height: 500,
        resizable: true
      },
      content: `        
        <div id="main-content-${appName}" style="display: flex; height: 100%;">
          <!-- Sideview for file navigation -->
          <div id="file-navigator-${appName}" style="width: 20%; border-right: 1px solid #ccc; overflow-y: auto; padding: 6px;">
            <ul id="file-list-${appName}" style="list-style: none; padding: 0; margin: 0;"></ul>
          </div>
          <!-- Main editor area -->
          <div style="flex: 1; padding: 6px;">
            <div class="flex flex-col gap-2 h-full" style="width: 80%;height:100%;">
              <div class="flex gap-2 items-center" style="padding-bottom:6px">
                <input id="filename-${appName}" value="/home/nto-service.js" class="border px-2 py-1 rounded w-60" placeholder="File path">
                <button id="loadBtn-${appName}" class="border px-2 py-1 rounded">Load</button>
                <button id="saveBtn-${appName}" class="border px-2 py-1 rounded">Save</button>
              </div>
              <textarea id="editorArea-${appName}" class="flex-1" style="width: 80%;height:100%;"></textarea>
            </div>
          </div>
        </div>
      `,
      jsContent: (app) => {
        codeeditor = {};
        codeeditor.editor = CodeMirror.fromTextArea(
          document.getElementById(`editorArea-${app.header.appName}`),
          {
            mode: "javascript",
            lineNumbers: true,
            theme: "monokai",
            tabSize: 2,
            indentWithTabs: false,
          }
        );
        // codeeditor.editor.setSize("100%", "100%");

        const loadFile = (path) => {
          RFC.callRFC("codeEditor.load", [path], (ret) => {
            codeeditor.editor.setValue(ret[0]);
            document.getElementById(`filename-${app.header.appName}`).value = path.substring(1); // Remove leading slash
          });
        };

        RFC.callRFC("codeEditor.getStructure", ["/"], (ret) => {
          const files = JSON.parse(ret[0]);

          function renderFileList(files, parentUl) {
            files.forEach(file => {
              const li = document.createElement('li');
              li.classList.add('list-group-item', 'py-1', 'px-2');
              li.style.border = 'none';
              if (file.isDirectory) {
                li.style.cursor = 'pointer';
                li.innerHTML = `<span>📁 ${file.name}</span>`;
                let expanded = false;
                let childUl = null;
                li.addEventListener('click', function (e) {
                  e.stopPropagation();
                  if (!expanded) {
                    if (!childUl) {
                      childUl = document.createElement('ul');
                      childUl.classList.add('list-group', 'ms-3');
                      childUl.style.border = 'none';
                      // Ambil isi folder secara dinamis
                      RFC.callRFC("codeEditor.getStructure", [file.path], (ret2) => {
                        const children = JSON.parse(ret2[0]);
                        renderFileList(children, childUl);
                      });
                      li.appendChild(childUl);
                    }
                    childUl.style.display = '';
                  } else {
                    if (childUl) childUl.style.display = 'none';
                  }
                  expanded = !expanded;
                });
              } else {
                li.textContent = file.name;
              }
              parentUl.appendChild(li);
            });
          }

          const ul = document.createElement('ul');
          ul.classList.add('list-group');
          ul.style.border = 'none';
          renderFileList(files, ul);
          const targetElement = col1.element || col1;
          targetElement.innerHTML = ""; // Bersihkan sebelum render baru
          targetElement.appendChild(ul);
        });




        document.getElementById(`loadBtn-${app.header.appName}`).onclick = async () => {
          const path = document.getElementById(`filename-${app.header.appName}`).value.trim();
          if (!path) return alert("Masukkan path file.");
          try {
            loadFile(path);
          } catch (e) {
            alert("Gagal membuka file: " + e.message);
          }
        };

        document.getElementById(`saveBtn-${app.header.appName}`).onclick = async () => {
          try {
            const path = document.getElementById(`filename-${app.header.appName}`).value.trim();
            if (!path) return alert("Masukkan path untuk menyimpan.");
            const content = codeeditor.editor.getValue();
            RFC.callRFC("codeEditor.save", [path, content], (ret) => { });
            alert("File disimpan ke " + path);
          } catch (e) {
            RFC.callRFC("desktop.jsContentError", [e.message, e.stack], (ret) => { });
          }
        };
      },
      main: (sender, nos) => {
        sender.ws.remoteFunction.codeEditor = {};

        sender.ws.remoteFunction.codeEditor.save = (params) => {
          let fileName = params[0];
          let content = params[1];
          sender.fa.writeFileSync(fileName, content);
          return ["OK"];
        };

        sender.ws.remoteFunction.codeEditor.load = (params) => {
          let fileName = params[0];
          let content = sender.fa.readFileSync(fileName);
          return [content];
        };

        sender.ws.remoteFunction.codeEditor.getStructure = (params) => {
          let dirPath = params[0];
          let structure = sender.fa.readdirSync(dirPath).map((name) => {
            const stats = sender.fa.statSync(`${dirPath}/${name}`);
            return {
              name,
              isDirectory: stats.isDirectory(),
              isFile: stats.isFile(),
              path: `${dirPath}/${name}`
            };
          });
          return [JSON.stringify(structure)];
        };
      },
    };
  }
};
