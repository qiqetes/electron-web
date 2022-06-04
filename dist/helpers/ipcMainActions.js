"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToast = void 0;
var LocalServer_1 = require("../core/LocalServer");
var appData_1 = require("../data/appData");
var settingsData_1 = require("../data/settingsData");
var electron_1 = require("electron");
var init_1 = require("./init");
var downloadsData_1 = require("../data/downloadsData");
var index_1 = require("../index");
function ipcMainActions() {
    electron_1.ipcMain.on("saveSetting", function (_, setting, value) {
        settingsData_1.SettingsData.saveSetting(setting, value);
    });
    electron_1.ipcMain.on("startLocalServer", function () {
        return LocalServer_1.LocalServerInstance.start(settingsData_1.SettingsData.downloadsPath);
    });
    electron_1.ipcMain.on("stopLocalServer", function () { return LocalServer_1.LocalServerInstance.stop(); });
    electron_1.ipcMain.on("setAuth", function (_, auth) {
        appData_1.AppData.AUTHORIZATION = "Bearer ".concat(auth);
        init_1.api.headers.Authorization = appData_1.AppData.AUTHORIZATION;
    });
    electron_1.ipcMain.on("addDownload", function (_, trainingClass, mediatype, timestamp) {
        if (mediatype === void 0) { mediatype = "video_hd"; }
        downloadsData_1.DownloadsData.addToQueue(trainingClass, mediatype, timestamp);
    });
}
exports.default = ipcMainActions;
var sendToast = function (message, variation, duration) {
    index_1.mainWindow.webContents.send("toast", "SETTINGS SAVED", null, 20);
};
exports.sendToast = sendToast;
//# sourceMappingURL=ipcMainActions.js.map