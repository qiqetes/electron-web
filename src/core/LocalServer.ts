import { filenameStealth } from "../helpers/downloadsHelpers";
import ChildProcess from "child_process";

import EventEmitter from "events";
import * as path from "node:path";

export default class LocalServer extends EventEmitter {
  port: string;
  root: "";
  running: boolean;
  error: boolean;
  streamingServer = ChildProcess.ChildProcess;

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
    this.port = Math.floor(
      Math.random() * (42666 - 42660 + 1) + 42660
    ).toString();

    console.log("STARTING LOCAL SERVER");
    if (!downloadsPath) {
      console.error("NO ROOT PATH");
      return;
    }

    if (this.running) {
      console.warn();
    }

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

    this.streamingServer = ChildProcess.fork(
      scriptPath,
      [this.port, "offline", downloadsPath],
      options
    );

    const streamingServer = this.streamingServer;

    process.on("beforeExit", () => {
      this.stop();
      console.log("Exiting...");
    });
    process.on("exit", () => {
      console.log("Exit");
    });

    streamingServer.on("close", (code) => {
      console.log("CLOSE SERVER " + code);
      this.emit("stop");
    });
    streamingServer.on("exit", (code) => {
      console.log("EXIT SERVER " + code);
    });
    // streamingServer.on("message", (_) => {});
    streamingServer.on("error", (code) => {
      console.log("ERROR SERVER " + code);
      this.emit("error");
    });
    streamingServer.on("disconnect", (code: any) => {
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
