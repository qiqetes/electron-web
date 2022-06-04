"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalServerInstance = void 0;
var downloadsHelpers_1 = require("../helpers/downloadsHelpers");
var childProcess = __importStar(require("child_process"));
var events_1 = __importDefault(require("events"));
var path = __importStar(require("node:path"));
var LocalServer = /** @class */ (function (_super) {
    __extends(LocalServer, _super);
    function LocalServer() {
        var _this = _super.call(this) || this;
        _this.port = "42666";
        _this.root = "";
        _this.running = false;
        _this.error = false;
        return _this;
    }
    LocalServer.prototype.baseUrl = function () {
        return "http://127.0.0.1:".concat(this.port, "/offline");
    };
    // Returns the expected url for the media when the localServer is up
    LocalServer.prototype.lookupMediaUrl = function (id, mediaType) {
        return "".concat(this.baseUrl, "/").concat((0, downloadsHelpers_1.filenameStealth)(id, mediaType));
    };
    LocalServer.prototype.start = function (downloadsPath) {
        var _this = this;
        // Random port
        this.port = Math.floor(Math.random() * (42666 - 42660 + 1) + 42660).toString();
        console.log("STARTING LOCAL SERVER");
        if (!downloadsPath) {
            console.error("NO ROOT PATH");
            return;
        }
        if (this.running) {
            console.warn();
        }
        /** Player */
        var scriptPath = path.join(path.dirname(__dirname), // TODO: debuggear esto a ver si va a la ruta que toca
        "libs", "ThreadStreaming.js");
        console.log("Started LocalServer serving media in port ".concat(this.port));
        var options = {
            cwd: path.dirname(process.execPath),
        };
        this.streamingServer = childProcess.fork(scriptPath, [this.port, "offline", downloadsPath], options);
        var streamingServer = this.streamingServer;
        process.on("beforeExit", function () {
            _this.stop();
            console.log("Exiting...");
        });
        process.on("exit", function () {
            console.log("Exit");
        });
        streamingServer.on("close", function (code) {
            console.log("CLOSE SERVER " + code);
            _this.emit("stop");
        });
        streamingServer.on("exit", function (code) {
            console.log("EXIT SERVER " + code);
        });
        // streamingServer.on("message", (_) => {});
        streamingServer.on("error", function (code) {
            console.log("ERROR SERVER " + code);
            _this.emit("error");
        });
        streamingServer.on("disconnect", function (code) {
            console.log("DISCONN SERVER " + code);
            _this.emit("stop");
        });
        process.on("exit", this.stop);
        process.once("exit", this.stop);
        this.emit("start");
    };
    LocalServer.prototype.stop = function () {
        if (this.streamingServer) {
            console.log("Stopped LocalServer serving media in port ".concat(this.port));
            this.streamingServer.emit("EXIT");
            this.streamingServer.kill();
        }
    };
    return LocalServer;
}(events_1.default));
exports.default = LocalServer;
exports.LocalServerInstance = new LocalServer();
//# sourceMappingURL=LocalServer.js.map