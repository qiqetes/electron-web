"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadsData = void 0;
var path = require("path");
var downloadsHelpers_1 = require("../helpers/downloadsHelpers");
var appData_1 = require("./appData");
var settingsData_1 = require("./settingsData");
var fs = __importStar(require("fs"));
var https = __importStar(require("node:https"));
var __1 = require("..");
var offlineTrainingClass_1 = require("../models/offlineTrainingClass");
var trainingClassesData_1 = require("./trainingClassesData");
var init_1 = require("../helpers/init");
var DownloadsDataModel = /** @class */ (function () {
    function DownloadsDataModel() {
        var _this = this;
        this.offlineTrainingClasses = [];
        this.trainingClassesScheduled = [];
        this.isDownloading = false;
        this.getFirstQueued = function () {
            var queuedTrainingClasses = _this.getQueued();
            if (!queuedTrainingClasses.length)
                return null;
            return queuedTrainingClasses.sort(function (a, b) { return a.timeStamp - b.timeStamp; })[0];
        };
        this.stopDownloading = function () {
            _this.isDownloading = false;
        };
        this.startDownloads = function () {
            _this.downloadNext();
        };
        this.downloadNext = function () {
            if (_this.isDownloading)
                return;
            var download = _this.getFirstQueued();
            var media = download.getQueuedMediaType();
            var filename = path.join(settingsData_1.SettingsData.downloadsPath, (0, downloadsHelpers_1.filenameStealth)(download.id, media));
            var accessToken = appData_1.AppData.AUTHORIZATION.replace("Bearer ", "");
            var url = "/training_classes/".concat(download.id, "/download?type=").concat(media, "&player=app_preloading&access_token=").concat(accessToken);
            var options = {
                host: "api.bestcycling.es",
                port: 443,
                method: "GET",
                path: "/api/bestapp" + url,
                headers: {
                    "X-APP-ID": appData_1.AppData.APPID,
                    "X-APP-VERSION": appData_1.AppData.XAPPID,
                    "Content-Type": "video/mp4", // TODO:
                },
            };
            _this.isDownloading = true;
            var writeStream = fs.createWriteStream(filename);
            https.get(options, function (res) {
                var received = 0;
                var totalSize = parseInt(res.headers["content-length"]);
                var nChunks = 0;
                // Data received
                res.on("data", function (chunk) {
                    received += chunk.length;
                    download.progress = (received / totalSize) * 100;
                    for (var i = 0; i < chunk.length; i += 1) {
                        chunk[i] = ~chunk[i];
                    }
                    var bufferStore = writeStream.write(chunk);
                    nChunks += 1;
                    if (nChunks % 500 === 0)
                        console.log(download.progress + "%");
                    // Si el buffer está lleno pausamos la descarga
                    if (bufferStore === false) {
                        res.pause();
                    }
                });
                // resume the streaming when emptied
                writeStream.on("drain", function () {
                    res.resume();
                });
                res.on("close", function () {
                    _this.isDownloading = false;
                    console.log("DOWNLOAD CLOSED");
                    // TODO:
                });
                res.on("timeout", function (err) {
                    _this.isDownloading = false;
                    console.log("DOWNLOAD TIMEOUT", err);
                });
                res.on("error", function (err) {
                    _this.isDownloading = false;
                    console.log("Error downloading schedule with Id: ".concat(download.id), err);
                    __1.mainWindow.webContents.send("toast", "Error en la descarga", "warn", 5);
                    // TODO: handle retries
                    // if(download.retries < 5){
                    //   download.retries += 1
                    // }
                    download.changeStatus(media, "error");
                });
                res.on("abort", function (err) {
                    _this.isDownloading = false;
                    console.log("Error downloading schedule with Id: ".concat(download.id), err);
                    __1.mainWindow.webContents.send("toast", "Descarga abortada", "warn", 5);
                    download.changeStatus(media, "error");
                });
                res.on("end", function () {
                    console.log("Ended download id: " + download.id);
                    __1.mainWindow.webContents.send("toast", "Clase descargada");
                    writeStream.end();
                    download.changeStatus(media, "downloaded");
                    _this.isDownloading = false;
                    _this.downloadNext();
                });
            });
        };
        this.getFromDb = function () {
            _this.offlineTrainingClasses = init_1.DB.data.downloads.offlineTrainingClasses;
            _this.trainingClassesScheduled = init_1.DB.data.downloads.trainingClassesScheduled;
        };
        this.saveToDb = function () {
            init_1.DB.data.downloads = _this;
        };
        this.removeAll = function () {
            fs.rm(settingsData_1.SettingsData.downloadsPath, function (err) {
                if (err) {
                    __1.mainWindow.webContents.send("toast", "Error al borrar las clases descargadas", "error", 3);
                    return;
                }
                _this.offlineTrainingClasses = [];
                _this.trainingClassesScheduled = [];
            });
        };
        this.importFromFolder = function (folder) {
            throw new Error("Method not implemented.");
        };
    }
    DownloadsDataModel.prototype.addToQueue = function (trainingClass, mediaType, timestamp) {
        // Check if already in queue
        if (this.offlineTrainingClasses.find(function (item) { return item.id === trainingClass.id; }))
            return;
        var offlineTrainingClass = new offlineTrainingClass_1.OfflineTrainingClass(trainingClass, mediaType, timestamp);
        if ((0, downloadsHelpers_1.isCompleteTrainingClass)(trainingClass)) {
            trainingClassesData_1.TrainingClassesData.trainingClasses.push(trainingClass);
        }
        else {
            // TrainingClass needs to be fetched
        }
    };
    DownloadsDataModel.prototype.getQueued = function () {
        return this.offlineTrainingClasses.filter(function (item) {
            return item.statusVideoHd === "queued" ||
                item.statusVideoSd === "queued" ||
                item.statusAudio === "queued" ||
                item.statusMusic === "queued";
        });
    };
    return DownloadsDataModel;
}());
exports.DownloadsData = new DownloadsDataModel();
//# sourceMappingURL=downloadsData.js.map