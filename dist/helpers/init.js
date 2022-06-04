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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.init = exports.DB = void 0;
var fs = __importStar(require("fs-extra"));
var electron_1 = require("electron");
var trainingClassesData_1 = require("../data/trainingClassesData");
var kitsu_1 = __importDefault(require("kitsu"));
var path_1 = require("path");
var lowdb_1 = require("@commonify/lowdb");
var appData_1 = require("../data/appData");
var settingsData_1 = require("../data/settingsData");
var downloadsData_1 = require("../data/downloadsData");
// Use JSON file for storage
var file = (0, path_1.join)(electron_1.app.getPath("userData"), "db.json");
var adapter = new lowdb_1.JSONFile(file);
exports.DB = new lowdb_1.Low(adapter);
// Gets the chromium preferences from the old directory if they exist and
// saves them to be accesible from the webapp localStorage
var recoverOldPrefs = function () {
    var userDataPath = electron_1.app.getPath("userData");
    var oldLocalStoragePath = userDataPath + "/default/Local Storage";
    var newLocalStoragePath = userDataPath + "/Local Storage";
    if (!fs.existsSync(oldLocalStoragePath))
        return;
    fs.copySync(oldLocalStoragePath, newLocalStoragePath);
    fs.rmSync(oldLocalStoragePath, { recursive: true, force: true });
    console.log("Successfully imported old prefs");
    electron_1.app.relaunch();
};
// Processess that should be initialized before the webpage loads
var init = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, initDB()];
            case 1:
                _a.sent();
                setStartingUrl();
                recoverOldPrefs();
                return [2 /*return*/];
        }
    });
}); };
exports.init = init;
/// Sets the url starting point depending on gyms scheduler settings
var setStartingUrl = function () {
    if (settingsData_1.SettingsData.autoStartGymsScheduler) {
        appData_1.AppData.URL =
            appData_1.AppData.WEBAPP_WEBASE +
                "/app#/gyms/rooms/".concat(settingsData_1.SettingsData.defaultRoom, "/play");
    }
    console.log(appData_1.AppData.URL);
};
var initDB = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: 
            // Read the DB
            return [4 /*yield*/, exports.DB.read()];
            case 1:
                // Read the DB
                _a.sent();
                // Init database if it doesn't exist
                if (exports.DB.data === null) {
                    exports.DB.data = {
                        settings: settingsData_1.SettingsData,
                        trainingClasses: trainingClassesData_1.TrainingClassesData,
                        downloads: downloadsData_1.DownloadsData,
                    };
                    void exports.DB.write();
                }
                else {
                    settingsData_1.SettingsData.getFromDb();
                    trainingClassesData_1.TrainingClassesData.getFromDb();
                    downloadsData_1.DownloadsData.getFromDb();
                }
                return [2 /*return*/];
        }
    });
}); };
exports.api = new kitsu_1.default({
    baseUrl: "https://apiv2.bestcycling.es/api/v2",
    headers: {
        "Content-Type": "application/vnd.api+json",
        "X-APP-ID": appData_1.AppData.XAPPID,
        // "X-APP-VERSION": appVersion,
        Authorization: appData_1.AppData.AUTHORIZATION,
    },
});
//# sourceMappingURL=init.js.map