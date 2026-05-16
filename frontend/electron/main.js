const { app, BrowserWindow } = require("electron");
const path = require("path");
const { ipcMain } = require("electron");
const fs = require("fs");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

ipcMain.handle("generate-pdf", async (event, { html, fileName }) => {
    const tempPath = path.join(app.getPath("temp"), `invoice-${Date.now()}.html`)
    fs.writeFileSync(tempPath, html, "utf-8")

    const win = new BrowserWindow({
        show: false,
        webPreferences: { offscreen: true }
    })

    await win.loadFile(tempPath)

    const pdfBuffer = await win.webContents.printToPDF({
        pageSize: "A4",
        printBackground: true
    })

    win.close()
    fs.unlinkSync(tempPath)

    const filePath = path.join(app.getPath("documents"), `${fileName}.pdf`)
    fs.writeFileSync(filePath, pdfBuffer)

    return { success: true, filePath }
})

ipcMain.handle("print-invoice", async (event, html) => {
    const tempPath = path.join(app.getPath("temp"), `invoice-print-${Date.now()}.html`)
    fs.writeFileSync(tempPath, html, "utf-8")

    const win = new BrowserWindow({ show: false })
    await win.loadFile(tempPath)

    win.webContents.print({ silent: false, printBackground: true }, () => {
        win.close()
        fs.unlinkSync(tempPath)
    })

    return true
})

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
        win.loadURL("http://localhost:5173");
        win.webContents.openDevTools();
    } else {
        const appPath = app.getAppPath();
        const distPath = path.join(appPath, "frontend", "dist", "index.html");

        win.webContents.openDevTools();

        win.loadFile(distPath).catch((err) => {
            console.error("Failed to load file:", distPath, err);
            console.error("App path:", appPath);
            console.error("__dirname:", __dirname);

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