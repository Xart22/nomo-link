const net = require("net");

const { shell, ipcRenderer } = require("electron");

window.addEventListener("DOMContentLoaded", async () => {
    const btnNomo = document.getElementById("openNomokit");
    const statusNomoLink = document.getElementById("statusNomoLink");
    const wraperStatusNomoLink = document.getElementById("wraperStatus");
    const wraperUpdate = document.getElementById("wraperUpdate");
    const dot = document.getElementsByClassName("dot");
    const allowSSL = document.getElementById("allowSSL");
    const addZip = document.getElementById("addZip");
    const fileZip = document.getElementById("zipFile");
    const loader = document.getElementById("lds-roller");

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
            loader.style.display = "none";
            wraperUpdate.style.display = "none";
            statusNomoLink.innerHTML = `<span class="dot"></span> Online`;
            dot[0].style.backgroundColor = "green";
            btnNomo.style.display = "block";
            allowSSL.style.display = "block";
            wraperStatusNomoLink.style.display = "block";
        } else {
            statusNomoLink.innerHTML = `<span class="dot"></span> Offline`;
            dot[0].style.backgroundColor = "red";
            btnNomo.style.display = "none";
            allowSSL.style.display = "none";
        }
    });

    async function openNomokit() {
        await shell.openExternal("https://nomo-kit.com/");
    }
    async function allowSsl() {
        await shell.openExternal("https:127.0.0.1:20111/");
    }

    btnNomo.addEventListener("click", openNomokit);
    allowSSL.addEventListener("click", allowSsl);

    addZip.addEventListener("click", async () => {
        fileZip.click();
        fileZip.addEventListener("change", async () => {
            loader.style.display = "block";
            btnNomo.disabled = true;
            allowSSL.disabled = true;
            addZip.disabled = true;
            const file = fileZip.files[0];
            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = async () => {
                const data = new Uint8Array(reader.result);
                ipcRenderer.send("addZip", { data: data, name: file.name });
                fileZip.value = "";
            };
        });
    });

    ipcRenderer.on("addZip-reply", (event, arg) => {
        loader.style.display = "none";
        btnNomo.disabled = false;
        allowSSL.disabled = false;
        addZip.disabled = false;
    });
    ipcRenderer.on("download-progress", function (event, text) {
        const progress = document.getElementById("progress-bar");
        progress.style.width = text + "%";
        progress.innerHTML = text.toFixed(0) + "%";
    });
});
