const { app, BrowserWindow, Tray, Menu } = require("electron");
const path = require("path");
const OpenBlockLink = require("./src/index");

const link = new OpenBlockLink();
const startService = async () => {
    link.listen();

    link.on("ready", () => {
        console.info("Server is ready.");
    });

    link.on("address-in-use", () => {
        console.info("Address in use.");
    });
};

const kill = require("kill-port");

function createWindow() {
    const win = new BrowserWindow({
        width: 400,
        height: 330,
        maxHeight: 330,
        maxWidth: 400,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, "preload.js"),
        },
        icon: path.join(__dirname, "assets/icons/nomo.png"),
        title: "Nomokit-link",
        fullscreenable: false,
        fullscreen: false,
    });
    win.removeMenu();
    startService();
    win.webContents.openDevTools();
    var contextMenu = Menu.buildFromTemplate([
        {
            label: "Show App",
            click: function () {
                win.show();
            },
        },
        {
            label: "Close",
            click: function () {
                app.isQuiting = true;
                app.quit();
            },
        },
    ]);
    let appIcon = new Tray(path.join(__dirname, "assets/icons/nomo.png"));
    appIcon.setToolTip("Nomo");
    appIcon.setContextMenu(contextMenu);

    win.loadFile("index.html");
    win.on("closed", async () => {
        console.log("closed");
        await stopService();
    });

    win.on("minimize", function (event) {
        event.preventDefault();
        win.hide();
    });
}

app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", async () => {
    if (process.platform !== "darwin") {
        await stopService();
        app.quit();
    }
});

app.on("minimize", function (event) {
    console.log("minimize");
    event.preventDefault();
    app.hide();
});

const stopService = async () => {
    await kill(20111, "tcp").then(() => {
        console.log("Port 20111 is now free");
    });
};
