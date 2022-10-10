const net = require("net");
const { spawn } = require("child_process");
const path = require("path");
const libPath = path.join(process.resourcesPath, "test");
const { shell } = require("electron");
const run = (cmd, args, callback) => {
    const sp = spawn(cmd, args);
    let data = "";
    sp.stdout.on("data", (chunk) => {
        data += chunk;
    });
    sp.stderr.on("data", (chunk) => {
        data += chunk;
    });
    sp.on("close", () => {
        callback(data);
    });
};

window.addEventListener("DOMContentLoaded", async () => {
    console.log(libPath);
    const btnNomo = document.getElementById("openNomokit");
    const statusNomoLink = document.getElementById("statusNomoLink");
    const dot = document.getElementsByClassName("dot");
    const allowSSL = document.getElementById("allowSSL");
    console.log(libPath);
    async function stall(stallTime = 5000) {
        await new Promise((resolve) => setTimeout(resolve, stallTime));
    }

    const checkPort = async (port, host, callback) => {
        await stall();
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on("connect", () => {
            socket.destroy();
            callback(true);
        });
        socket.on("timeout", () => {
            socket.destroy();
            callback(false);
        });
        socket.on("error", () => {
            socket.destroy();
            callback(false);
        });
        socket.connect(port, host);
    };

    checkPort(20111, "127.0.0.1", (isPortOpen) => {
        if (isPortOpen) {
            statusNomoLink.innerHTML = `<span class="dot"></span> Online`;
            dot[0].style.backgroundColor = "green";
            btnNomo.style.display = "block";
            allowSSL.style.display = "block";
        } else {
            statusNomoLink.innerHTML = `<span class="dot"></span> Offline`;
            dot[0].style.backgroundColor = "red";
            btnNomo.style.display = "none";
            allowSSL.style.display = "none";
        }
    });

    async function openNomokit() {
        await shell.openExternal("https:nomokit-app.robo-club.com/");
    }
    async function allowSsl() {
        await shell.openExternal("https:127.0.0.1:20111/");
    }

    btnNomo.addEventListener("click", openNomokit);
    allowSSL.addEventListener("click", allowSsl);
});
