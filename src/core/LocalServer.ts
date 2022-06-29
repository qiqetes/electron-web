import { filenameStealth } from "../helpers/downloadsHelpers";
import * as child_process from "child_process";

import EventEmitter from "events";
import * as path from "node:path";
import { logError } from "../helpers/loggers";

export default class LocalServer extends EventEmitter {
  port: string;
  root: "";
  running: boolean;
  error: boolean;
  streamingServer: child_process.ChildProcess | undefined;

  constructor() {
    super();
    this.port = "42666";
    this.root = "";
    this.running = false;
    this.error = false;
  }

  baseUrl() {
    return `http://127.0.0.1:${this.port}/offline`;
  }

  // Returns the expected url for the media when the localServer is up
  lookupMediaUrl(id: number | string, mediaType: mediaType) {
    return `${this.baseUrl}/${filenameStealth(id, mediaType)}`;
  }

  start(downloadsPath: string) {
    // Random port
    this.port = Math.floor(Math.random() * 20000 + 42666).toString();

    console.log("STARTING LOCAL SERVER");
    if (!downloadsPath) {
      logError("NO ROOT PATH");
      return;
    }

    if (this.running) {
      console.warn();
    }

    console.log(
      "Starting local server in path:",
      path.join(path.dirname(__dirname), "libs", "ThreadStreaming.js")
    );
    /** Player */
    const scriptPath = path.join(
      path.dirname(__dirname), // TODO: debuggear esto a ver si va a la ruta que toca
      "libs",
      "ThreadStreaming.js"
    );

    console.log(`Started LocalServer serving media in port ${this.port}`);
    const options = {
      cwd: path.dirname(process.execPath),
    };

    console.log("PORT", this.port);
    console.log("DOWNLOADS PATH", downloadsPath);
    this.streamingServer = child_process.fork(
      scriptPath,
      [this.port, "offline", downloadsPath],
      options
    );

    process.on("beforeExit", () => {
      this.stop();
      console.log("Exiting...");
    });
    process.on("exit", () => {
      console.log("Exit");
    });

    this.streamingServer.on("close", (code) => {
      console.log("CLOSE SERVER " + code);
      this.emit("stop");
    });
    this.streamingServer.on("exit", (code) => {
      console.log("EXIT SERVER " + code);
    });
    // streamingServer.on("message", (_) => {});
    this.streamingServer.on("error", (code) => {
      logError("ERROR SERVER " + code);
      this.emit("error");
    });
    this.streamingServer.on("disconnect", (code: any) => {
      console.log("DISCONN SERVER " + code);
      this.emit("stop");
    });
    process.on("exit", this.stop);
    process.once("exit", this.stop);
    this.emit("start");
  }

  stop() {
    if (this.streamingServer) {
      console.log(`Stopped LocalServer serving media in port ${this.port}`);

      this.streamingServer.emit("EXIT");
      this.streamingServer.kill();
    }
  }
}

export const LocalServerInstance = new LocalServer();
