"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    isDesktop: true,
    // Saves settings from webapp to SettingsData
    saveSetting: function (setting, value) {
        electron_1.ipcRenderer.send("saveSetting", setting, value);
    },
    // Send toast notification
    handleToast: function (callback) { return electron_1.ipcRenderer.on("toast", callback); },
    setAuth: function (auth) {
        electron_1.ipcRenderer.send("setAuth", auth);
    },
});
electron_1.contextBridge.exposeInMainWorld("downloadsAPI", {
    // offlineTrainingClasses: DownloadsData,
    startLocalServer: electron_1.ipcRenderer.send("startLocalServer"),
    stopLocalServer: electron_1.ipcRenderer.send("stopLocalServer"),
});
//# sourceMappingURL=preload.js.map