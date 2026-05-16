const { app, BrowserWindow } = require("electron");
const path = require("path");
const { ipcMain } = require("electron");
const fs = require("fs");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

ipcMain.handle("generate-pdf", async (event, { html, fileName }) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true
      }
    });
  
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  
    const pdfBuffer = await win.webContents.printToPDF({
      format: "A4",
      printBackground: true
    });
  
    const filePath = path.join(app.getPath("documents"), `${fileName}.pdf`);
  
    fs.writeFileSync(filePath, pdfBuffer);
  
    win.close();
  
    return { success: true, filePath };
  });
  
function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    if (isDev) {
        // Development: load from Vite dev server
        win.loadURL("http://localhost:5173");
        win.webContents.openDevTools();
    } else {
        // Production: load from built files
        // In packaged app, files are in resources/app.asar
        const appPath = app.getAppPath();
        const distPath = path.join(appPath, "frontend", "dist", "index.html");
        
        // Enable DevTools in production for debugging (remove later)
        win.webContents.openDevTools();
        
        win.loadFile(distPath).catch((err) => {
            console.error("Failed to load file:", distPath, err);
            console.error("App path:", appPath);
            console.error("__dirname:", __dirname);
            
            // Try alternative path structure
            const altPath = path.join(__dirname, "..", "frontend", "dist", "index.html");
            console.log("Trying alternative path:", altPath);
            win.loadFile(altPath).catch((err2) => {
                console.error("Failed to load alternative path:", altPath, err2);
            });
        });
    }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
