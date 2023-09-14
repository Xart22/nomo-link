const electronInstaller = require("electron-winstaller");
const path = require("path");

const resultPromise = electronInstaller.createWindowsInstaller({
    appDirectory: path.join(__dirname, "build", "nomo"),
    outputDirectory: path.join(__dirname, "builds", "installer"),
    authors: "Fajar.",
    exe: "nomolink.exe",
});

resultPromise.then(
    () => console.log("It worked!"),
    (e) => console.log(`No dice: ${e.message}`)
);
