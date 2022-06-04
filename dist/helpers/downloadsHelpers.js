"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTrainingClass = exports.isCompleteTrainingClass = exports.filenameStealth = void 0;
var init_1 = require("./init");
var mediaTypeFileCodes = {
    video_hd: "9783",
    video_sd: "9783",
    audio: "8397",
    music: "7893",
};
var filenameStealth = function (id, mediaType) {
    return "".concat(id, "_").concat(mediaTypeFileCodes[mediaType]);
};
exports.filenameStealth = filenameStealth;
// Checks if a TrainingClass object has all the required fields (media, progression...)
var isCompleteTrainingClass = function (tr) {
    return !!(tr.media && tr.progression);
};
exports.isCompleteTrainingClass = isCompleteTrainingClass;
// Fetch TrainingClass info with all the parameters (media, progression...)
var fetchTrainingClass = function (id) {
    init_1.api
        .fetch("training_classes_".concat(id))
        .then(function (res) {
        console.log(res);
    })
        .catch(function (err) { return console.error(err); });
};
exports.fetchTrainingClass = fetchTrainingClass;
//# sourceMappingURL=downloadsHelpers.js.map