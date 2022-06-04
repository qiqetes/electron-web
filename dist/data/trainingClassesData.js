"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrainingClassesData = void 0;
var init_1 = require("../helpers/init");
var TrainingClassesDataModel = /** @class */ (function () {
    function TrainingClassesDataModel() {
        var _this = this;
        this.trainingClasses = [];
        this.saveToDb = function () {
            init_1.DB.data.trainingClasses = _this;
            void init_1.DB.write();
        };
        this.getFromDb = function () {
            _this.trainingClasses = init_1.DB.data.trainingClasses.trainingClasses;
        };
    }
    return TrainingClassesDataModel;
}());
exports.TrainingClassesData = new TrainingClassesDataModel();
//# sourceMappingURL=trainingClassesData.js.map