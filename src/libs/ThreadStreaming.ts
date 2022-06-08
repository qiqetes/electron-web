import * as fs from "node:fs";
import * as http from "node:http";

function initServer(port: string, tokenAuth: string, downloadsPath: string) {
  // create http server
  http
    .createServer(function (req, res) {
      process.send?.("init!!");

      const { method, url } = req;

      // Terminamos el servidor
      if (url == "/kill" || !url) {
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
        if (!url.startsWith(`/${tokenAuth}`)) {
          throw 401;
        }

        // Ruta del archivo
        const filepath = `${downloadsPath}/${url.split("/").slice(-1)}`;

        // Archivo no encontrado
        if (!fs.existsSync(filepath)) {
          throw 404;
        }

        const movie = fs.statSync(filepath);

        if (req.headers["range"]) {
          const range = req.headers.range;
          const parts = range.replace(/bytes=/, "").split("-");
          const partialstart = parts[0];
          const partialend = parts[1];
          const start = parseInt(partialstart, 10);
          let end = 0;
          if (partialend) {
            end = parseInt(partialend, 10);
          } else {
            const cksize = start + 4000000;
            if (cksize >= movie.size) {
              end = movie.size - 1;
            } else {
              end = cksize;
            }
          }
          const chunksize = end - start + 1;

          //console.log('RANGE: ' + start + ' - ' + end + ' = ' + chunksize);

          const fileStream = fs.createReadStream(filepath, {
            start: start,
            end: end,
          });

          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${movie.size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": "video/mp4",
          });

          fileStream.on("data", function (chunk: Buffer) {
            res.write(
              chunk.map((c) => ~c),
              "binary"
            );
          });

          fileStream.on("end", function () {
            res.end();
          });
        } else {
          const chunksize = 4000000;
          const fileStream = fs.createReadStream(filepath, {
            start: 0,
            end: chunksize,
          });

          res.writeHead(206, {
            "Content-Range": `bytes 0-${chunksize}/${movie.size}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": "video/mp4",
          });

          fileStream.on("data", function (chunk: Buffer) {
            for (let i = 0; i < chunk.length; i++) {
              chunk[i] = ~chunk[i];
            }
            res.write(chunk, "binary");
          });

          fileStream.on("end", function () {
            res.end();
          });
          process.send?.("first chunk");
        }
      } catch (error) {
        let code = parseInt(error as string, 10);
        if (code >= 0 && code <= 599) {
          // EMPTY?
        } else {
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
  console.info(`listening: http://127.0.0.1:${port}/${tokenAuth}`);
  process!.send?.(`listening: http://127.0.0.1:${port}/${tokenAuth}`);
  console.info(`serving from: ${downloadsPath}`);
  process.send?.(`serving from: ${downloadsPath}`);
}

process.on("message", function (m) {
  if (m === "EXIT") {
    process.send?.("exit");
    process.exit(0);
  }
});

process.send?.("init");
initServer(process.argv[0], process.argv[1], process.argv[2]);
