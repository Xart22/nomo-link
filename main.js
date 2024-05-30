const {
    app,
    BrowserWindow,
    Tray,
    Menu,
    ipcMain,
    dialog,
    shell,
} = require("electron");
const path = require("path");

const axios = require("axios");
const extract = require("extract-zip");
const Downloader = require("nodejs-file-downloader");
const logger = require("electron-log");
const { autoUpdater } = require("electron-updater");
const OpenBlockLink = require("./link/src/index");
const fs = require("fs-extra");

logger.transports.file.level = "info";
autoUpdater.logger = logger;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;

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

const syncLibary = async () => {
    try {
        const localDir = path.join(__dirname, "link/tools/Arduino/local");
        if (!fs.existsSync(localDir)) {
            fs.mkdirSync(localDir);
        }

        const versionFile = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, "link/tools/version.json"),
                "utf8"
            )
        );
        const response = await axios.get(
            "https://nomo-kit.com/api/check-update"
        );
        const data = response.data;
        if (data.version !== versionFile.version) {
            fs.rmSync(path.join(__dirname, "link/tools/Arduino/libraries"), {
                recursive: true,
                force: true,
            });

            const downloader = new Downloader({
                url: data.url,
                directory: path.join(__dirname, "link/tools/Arduino/libraries"),
            });

            const { filePath, downloadStatus } = await downloader.download();
            if (downloadStatus === "COMPLETE") {
                await extract(
                    filePath,
                    {
                        dir: path.join(
                            __dirname,
                            "link/tools/Arduino/libraries"
                        ),
                    },
                    function (err) {
                        if (err) {
                            console.log(err);
                        }
                    }
                );

                fs.readdir(
                    path.join(__dirname, "link/tools/Arduino/libraries"),
                    (err, files) => {
                        files.forEach(async (file) => {
                            if (file !== data.version + ".zip") {
                                await extract(
                                    path.join(
                                        __dirname,
                                        "link/tools/Arduino/libraries/" + file
                                    ),
                                    {
                                        dir: path.join(
                                            __dirname,
                                            "link/tools/Arduino/libraries"
                                        ),
                                    },
                                    function (err) {
                                        if (err) {
                                            console.log(err);
                                        }
                                    }
                                );
                                fs.unlinkSync(
                                    path.join(
                                        __dirname,
                                        "link/tools/Arduino/libraries/" + file
                                    )
                                );
                            } else {
                                fs.unlinkSync(
                                    path.join(
                                        __dirname,
                                        "link/tools/Arduino/libraries",
                                        file
                                    )
                                );
                            }
                        });
                    }
                );
                fs.readdir(
                    path.join(__dirname, "link/tools/Arduino/local"),
                    (err, files) => {
                        files.forEach(async (file) => {
                            if (file.includes(".zip")) {
                                await extract(
                                    path.join(
                                        __dirname,
                                        "link/tools/Arduino/local/" + file
                                    ),
                                    {
                                        dir: path.join(
                                            __dirname,
                                            "link/tools/Arduino/libraries"
                                        ),
                                    }
                                );
                            }
                        });
                    }
                );

                fs.writeFileSync(
                    path.join(__dirname, "link/tools/version.json"),
                    JSON.stringify(data)
                );
            }
        }
    } catch (error) {
        console.log(error);
    }
};
const localLib = JSON.parse(
    fs.readFileSync(path.join(__dirname, "/localLib.json"), "utf8")
);

const kill = require("kill-port");
const template = [
    {
        label: "Local Library",
        submenu: localLib.map((item, index) => {
            return {
                label: `${index + 1}. ${item}`,
            };
        }),
    },

    {
        role: "help",
        submenu: [
            {
                label: "Learn More",
                click: async () => {
                    const { shell } = require("electron");
                    await shell.openExternal("https://nomo-kit.com/");
                },
            },
            {
                label: "Exit",
                click: async () => {
                    app.quit();
                },
            },
        ],
    },
];

const menu = Menu.buildFromTemplate(template);

let win;
async function createWindow() {
    win = new BrowserWindow({
        width: 400,
        height: 400,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, "preload.js"),
        },
        icon: path.join(__dirname, "assets/icons/nomolink.png"),
        title: "Nomokit-link",
        fullscreenable: false,
        fullscreen: false,
        resizable: false,
    });
    Menu.setApplicationMenu(menu);

    //win.webContents.openDevTools();
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
    if (process.env) {
    }
    let appIcon = new Tray(path.join(__dirname, "assets/icons/nomokit.png"));
    appIcon.setToolTip("Nomolink");
    appIcon.setContextMenu(contextMenu);

    win.loadFile("index.html");
    win.on("closed", async () => {
        win.destroy();
        app.quit();
    });

    win.on("minimize", function (event) {
        event.preventDefault();
        win.hide();
    });
    ipcMain.on("get-libary-path", (event, arg) => {
        console.log("get-libary-path");
        event.reply(
            "get-libary-path-reply",
            path.join(__dirname, "link/tools/Arduino/libraries")
        );
    });

    ipcMain.on("addZip", async (event, arg) => {
        const fileName = arg.name;
        const file = arg.data;

        try {
            fs.writeFileSync(
                path.join(__dirname, "local/" + fileName),
                Buffer.from(file),
                (err) => {
                    console.log(err);
                }
            );
            await extract(
                path.join(__dirname, "local/" + fileName),
                {
                    dir: path.join(__dirname, "local"),
                },
                function (err) {
                    if (err) {
                        console.log(err);
                    }
                }
            );

            const localLib = await readFileLocal();

            await extract(
                path.join(__dirname, "local/" + fileName),
                {
                    dir: path.join(__dirname, "link/tools/Arduino/libraries"),
                },
                function (err) {
                    if (err) {
                        console.log(err);
                    }
                }
            );
            fs.writeFileSync(
                path.join(__dirname, "localLib.json"),
                JSON.stringify(localLib)
            );
            dialog.showMessageBox({
                type: "info",
                title: "Success",
                message: "Add libary success",
            });
            event.reply("addZip-reply", "success");
            const template = [
                {
                    label: "Local Library",
                    submenu: localLib.map((item, index) => {
                        return {
                            label: `${index + 1}. ${item}`,
                        };
                    }),
                },

                {
                    role: "help",
                    submenu: [
                        {
                            label: "Learn More",
                            click: async () => {
                                const { shell } = require("electron");
                                await shell.openExternal(
                                    "https://nomo-kit.com/"
                                );
                            },
                        },
                        {
                            label: "Exit",
                            click: async () => {
                                app.quit();
                            },
                        },
                    ],
                },
            ];

            const menu = Menu.buildFromTemplate(template);
            Menu.setApplicationMenu(menu);
            logger.info("Add libary success");
        } catch (error) {
            logger.error(error);
            dialog.showMessageBox({
                type: "error",
                title: "Error",
                message: "Add libary error",
            });
        }
    });
}

async function readFileLocal() {
    const filesName = [];
    fs.readdir(path.join(__dirname, "local"), (err, files) => {
        files.forEach(async (file) => {
            if (!file.includes(".zip")) {
                filesName.push(file + ".h");
            }
        });
    });
    return filesName;
}

app.whenReady().then(async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
        await checkToolsUpdate().then(async () => {
            await syncLibary();
        });
        startService();
        localLib.forEach(async (fileName) => {
            let flname = fileName.replace(".h", ".zip");
            await extract(
                path.join(__dirname, "local/" + flname),
                {
                    dir: path.join(__dirname, "link/tools/Arduino/libraries"),
                },
                function (err) {
                    if (err) {
                        console.log(err);
                    }
                }
            );
        });
    }
    fs.removeSync(path.join(__dirname, "/update/link"));
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        win.destroy();
        app.quit();
    }
});

app.on("minimize", function (event) {
    event.preventDefault();
    app.hide();
});

const stopService = async () => {
    await kill(20111, "tcp").then(() => {
        console.log("Port 20111 is now free");
    });
};

app.on("ready", async () => {
    autoUpdater.checkForUpdatesAndNotify();
    autoUpdater.on("update-available", () => {
        if (process.platform !== "darwin") {
            dialog
                .showMessageBox({
                    type: "question",
                    title: "Update available",
                    message: "Update Version is available download now ?",
                    buttons: ["Yes", "No"],
                    yes: 0,
                    no: 1,
                })
                .then((result) => {
                    if (result.response === 0) {
                        win.loadFile(path.join(__dirname, "update.html"));
                        autoUpdater.downloadUpdate();
                    }
                });
        } else {
            dialog
                .showMessageBox({
                    type: "question",
                    title: "Update available",
                    message:
                        "Update Version is available, please update manually on the web",
                    buttons: ["Yes", "No"],
                    yes: 0,
                    no: 1,
                })
                .then((result) => {
                    if (result.response === 0) {
                        shell.openExternal("https://nomo-kit.com/download");
                    }
                });
        }
    });
    autoUpdater.on("update-downloaded", () => {
        dialog
            .showMessageBox({
                type: "question",
                title: "Update available",
                message: "Update is downloaded, will be installed on restart",
                buttons: ["Yes", "No"],
                yes: 0,
                no: 1,
            })
            .then((result) => {
                if (result.response === 0) {
                    autoUpdater.quitAndInstall(false, true);
                }
            });
    });
    autoUpdater.on("error", (err) => {
        dialog.showErrorBox("Error: ", err == null ? "unknown" : err);
    });
    autoUpdater.on("download-progress", (progressObj) => {
        win.webContents.send("download-progress", progressObj.percent);
    });
});

async function checkToolsUpdate() {
    logger.info("Syncing Link");
    try {
        const version = JSON.parse(
            fs.readFileSync(path.join(__dirname, "version.json"), "utf8")
        );
        const response = await axios.get(
            "https://nomo-kit.com/api/check-update-dektop"
        );
        const data = response.data;
        fs.writeFileSync(
            path.join(__dirname, "/version.json"),
            JSON.stringify(data)
        );
        if (data.link !== version.link) {
            dialog
                .showMessageBox({
                    type: "question",
                    title: "Update",
                    message:
                        "Update available for Link, do you want to update now?",
                    buttons: ["Yes", "No"],
                })
                .then(async (res) => {
                    if (res.response === 0) {
                        win.loadFile(path.join(__dirname, "/update.html"));
                        const downloader = new Downloader({
                            url: data.link_url,
                            directory: path.join(__dirname, "/update"),
                            onProgress: function (
                                percentage,
                                chunk,
                                remainingSize
                            ) {
                                win.webContents.send(
                                    "download-progress",
                                    percentage
                                );
                            },
                        });
                        const { filePath, downloadStatus } =
                            await downloader.download();
                        if (downloadStatus === "COMPLETE") {
                            //here update
                            await extract(
                                filePath,
                                { dir: path.join(__dirname, "/update") },
                                function (err) {
                                    if (err) {
                                        console.log(err);
                                    }
                                }
                            ).then(() => {
                                fs.copySync(
                                    path.join(__dirname, "/update"),
                                    path.join(__dirname),
                                    {
                                        overwrite: true,
                                    }
                                );

                                fs.writeFileSync(
                                    path.join(__dirname, "/version.json"),
                                    JSON.stringify(data)
                                );

                                dialog
                                    .showMessageBox({
                                        type: "info",
                                        title: "Success",
                                        message: "Update success",
                                    })
                                    .then(async (res) => {
                                        fs.readdir(
                                            path.join(__dirname, "/update"),
                                            (err, files) => {
                                                files.forEach((file) => {
                                                    if (file == "link.zip") {
                                                        fs.unlinkSync(
                                                            path.join(
                                                                __dirname,
                                                                "/update",
                                                                file
                                                            )
                                                        );
                                                    }
                                                });
                                            }
                                        );
                                        app.relaunch();
                                        app.exit();
                                    });
                            });
                        }
                    }
                });
        }
    } catch (error) {
        console.log(error);
    }
}
