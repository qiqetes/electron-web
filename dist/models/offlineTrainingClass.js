"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineTrainingClass = void 0;
var OfflineTrainingClass = /** @class */ (function () {
    function OfflineTrainingClass(trainingClass, mediaTypeToQueue, timestamp) {
        this.id = trainingClass.id;
        this.statusVideoHd = "none";
        this.statusVideoSd = "none";
        this.statusAudio = "none";
        this.statusMusic = "none";
        this.progress = 0;
        this.timeStamp = timestamp || null;
        this.retries = 0;
        this.changeStatus(mediaTypeToQueue, "queued");
    }
    OfflineTrainingClass.prototype.getQueuedMediaType = function () {
        if (this.statusVideoHd == "queued")
            return "video_hd";
        if (this.statusVideoSd == "queued")
            return "video_sd";
        if (this.statusAudio == "queued")
            return "audio";
        if (this.statusMusic == "queued")
            return "music";
        return null;
    };
    OfflineTrainingClass.prototype.changeStatus = function (mediaType, status) {
        if (mediaType == "video_hd")
            this.statusVideoHd = status;
        if (mediaType == "video_sd")
            this.statusVideoSd = status;
        if (mediaType == "audio")
            this.statusAudio = status;
        if (mediaType == "music")
            this.statusMusic = status;
    };
    return OfflineTrainingClass;
}());
exports.OfflineTrainingClass = OfflineTrainingClass;
//# sourceMappingURL=offlineTrainingClass.js.map