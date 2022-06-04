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
var fs = __importStar(require("node:fs"));
var http = __importStar(require("node:http"));
function initServer(port, tokenAuth, downloadsPath) {
    // create http server
    http
        .createServer(function (req, res) {
        process.send("init!!");
        var method = req.method, url = req.url;
        // Terminamos el servidor
        if (url == "/kill") {
            res.writeHead(200);
            res.end();
            process.exit(0);
        }
        try {
            // Método incorrecto
            if (method != "GET") {
                throw 405;
            }
            // Auth token incorrecto
            if (!url.startsWith("/".concat(tokenAuth))) {
                throw 401;
            }
            // Ruta del archivo
            var filepath = "".concat(downloadsPath, "/").concat(url.split("/").slice(-1));
            // Archivo no encontrado
            if (!fs.existsSync(filepath)) {
                throw 404;
            }
            var movie = fs.statSync(filepath);
            if (req.headers["range"]) {
                var range = req.headers.range;
                var parts = range.replace(/bytes=/, "").split("-");
                var partialstart = parts[0];
                var partialend = parts[1];
                var start = parseInt(partialstart, 10);
                var end = 0;
                if (partialend) {
                    end = parseInt(partialend, 10);
                }
                else {
                    var cksize = start + 4000000;
                    if (cksize >= movie.size) {
                        end = movie.size - 1;
                    }
                    else {
                        end = cksize;
                    }
                }
                var chunksize = end - start + 1;
                //console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);
                var fileStream = fs.createReadStream(filepath, {
                    start: start,
                    end: end,
                });
                res.writeHead(206, {
                    "Content-Range": "bytes ".concat(start, "-").concat(end, "/").concat(movie.size),
                    "Accept-Ranges": "bytes",
                    "Content-Length": chunksize,
                    "Content-Type": "video/mp4",
                });
                fileStream.on("data", function (chunk) {
                    res.write(chunk.map(function (c) { return ~c; }), "binary");
                });
                fileStream.on("end", function () {
                    res.end();
                });
            }
            else {
                var chunksize = 4000000;
                var fileStream = fs.createReadStream(filepath, {
                    start: 0,
                    end: chunksize,
                });
                res.writeHead(206, {
                    "Content-Range": "bytes 0-".concat(chunksize, "/").concat(movie.size),
                    "Accept-Ranges": "bytes",
                    "Content-Length": chunksize,
                    "Content-Type": "video/mp4",
                });
                fileStream.on("data", function (chunk) {
                    for (var i = 0; i < chunk.length; i++) {
                        chunk[i] = ~chunk[i];
                    }
                    res.write(chunk, "binary");
                });
                fileStream.on("end", function () {
                    res.end();
                });
                process.send("first chunk");
            }
        }
        catch (error) {
            var code = parseInt(error, 10);
            if (code >= 0 && code <= 599) {
                // EMPTY?
            }
            else {
                console.info(error);
                code = 400;
            }
            console.info("statusCode", code, url);
            res.writeHead(code);
            res.end();
            return;
        }
    })
        .listen(port);
    console.info("listening: http://127.0.0.1:".concat(port, "/").concat(tokenAuth));
    process.send("listening: http://127.0.0.1:".concat(port, "/").concat(tokenAuth));
    console.info("serving from: ".concat(downloadsPath));
    process.send("serving from: ".concat(downloadsPath));
}
process.on("message", function (m) {
    if (m === "EXIT") {
        process.send("exit");
        process.exit(0);
    }
});
process.send("init");
initServer(process.argv[0], process.argv[1], process.argv[2]);
//# sourceMappingURL=ThreadStreaming.js.map