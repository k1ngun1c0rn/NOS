module.exports = {
  application: () => {
    let appName = "edit";
    let appTitle = "Text Editor";

    return {
      header: {
        appName,
        appTitle,
        active: true,
        iconSmall: "icon_16_editor.png",
        iconMedium: "icon_22_editor.png",
        iconLarge: "icon_32_editor.png",
        width: 900,
        height: 600,
      },
      content: `
      <div id="main-content-${appName}" style="padding:6px">
      <div class="flex flex-col gap-2 h-full">
        <div class="flex gap-2 items-center" style="padding-bottom:6px">
          <input id="filename" value="/home/nos.readme" class="border px-2 py-1 rounded w-60" placeholder="File path (e.g. /home/code.md)">
          <button id="loadBtn" class="border px-2 py-1 rounded">Load</button>
          <button id="saveBtn" class="border px-2 py-1 rounded">Save</button>
        </div>
        <textarea id="editorArea-${appName}" class="flex-1"></textarea>
      </div>      
      </div>
    `,
      main: (sender, nos) => {
        // Optional backend logic (NOS side)

        sender.ws.remoteFunction.editor = {}; // Create namespace

        // Create remote function for save file
        sender.ws.remoteFunction.editor.save = (params) => {
          let fileName = params[0];
          let content = params[1];
          // sender.crt.textOut(fileName + " :: " + content);
          sender.fa.writeFileSync(fileName, content);
          return ["Sukses!"];
        };

        // Create remote function for load file
        sender.ws.remoteFunction.editor.load = (params) => {
          let fileName = params[0];
          // sender.crt.textOut(fileName + " :: " + content);
          let content = sender.fa.readFileSync(fileName);
          return [content];
        };
      },
      jsContent: (app) => {
        const editorId = "editorArea";
        let filename = "";

        tinymce.init({
          selector: `#${editorId}-${app.header.appName}`,
          height: 500,
          menubar: true,
          plugins: "code lists",
          toolbar:
            "undo redo | styleselect | bold italic underline | alignleft aligncenter alignright | bullist numlist outdent indent | code",
          content_style: "body { font-family: monospace; font-size: 14px; }",
          setup(editor) {
            document.getElementById("loadBtn").onclick = async () => {
              const path = document.getElementById("filename").value.trim();
              if (!path) return alert("Masukkan path file.");
              try {
                RFC.callRFC("editor.load", [path], (ret) => {
                  editor.setContent(ret[0]);
                });
              } catch (e) {
                alert("Gagal membuka file: " + e.message);
              }
            };

            document.getElementById("saveBtn").onclick = async () => {
              try {
                const path =
                  document.getElementById("filename").value.trim() || filename;
                if (!path) return alert("Masukkan path untuk menyimpan.");

                const content = editor.getContent();
                RFC.callRFC("editor.save", [path, content], (ret) => { });
                alert("File disimpan ke " + path);
              } catch (e) {
                RFC.callRFC(
                  "desktop.jsContentError",
                  [e, e.stack],
                  (ret) => { }
                );
              }
            };
          },
        });
      },
    };
  },
};
