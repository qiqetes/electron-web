"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppData = void 0;
var AppDataModel = /** @class */ (function () {
    function AppDataModel() {
        this.WEBAPP_WEBASE = "http://localhost:8080";
        this.LOGIN_PATH = "/app#/login";
        this.URL = this.WEBAPP_WEBASE + this.LOGIN_PATH;
        this.XAPPID = "bestcycling";
        this.APPID = "772529a79cd1b70760da6e4a97dd5189";
    }
    return AppDataModel;
}());
exports.AppData = new AppDataModel();
//# sourceMappingURL=appData.js.map