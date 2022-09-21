import { app } from "electron";
import fs from "fs-extra";
import { log } from "./loggers";
import path from "path";

import os from "os";

class ErrorReporterModel {
  errorsPath = app.getPath("crashDumps");
  sessionErrorReportFile = this.errorsPath + `/session_${Date.now()}.log`;
  lastSessionErrorReportFile: string | null = null;

  constructor() {
    this.init();
  }

  // FIXME: finish
  getLastSessionLogging() {
    const files = fs.readdirSync(this.errorsPath);
    const lastSessionFile = files.filter((f) => f.includes("session_")).pop();

    if (!lastSessionFile) return null;
    return path.join(this.errorsPath, lastSessionFile);
  }

  init() {
    this.lastSessionErrorReportFile = this.getLastSessionLogging();
    app.once("ready", () => {
      log("Starting manual error reporter", this.sessionErrorReportFile);
      fs.appendFileSync(this.sessionErrorReportFile, `User: \n`); // TODO: add user info
      fs.appendFile(
        this.sessionErrorReportFile,
        `OS: 
				COMPUTER: ${os.platform()} ${os.arch()} ${os.release()}
				CPUS: ${os.cpus()[0].model}x${os.cpus().length}
				FREE MEMORY: ${os.freemem()}
				TOTAL MEMORY: ${os.totalmem()}\n `
      );
    });
  }

  report(...errors: any[]) {
    const errorString = errors.map((e) => e.toString()).join(" ") + "\n";
    fs.appendFile(this.sessionErrorReportFile, errorString);
  }

  sendReport() {}
}

export const ErrorReporter = new ErrorReporterModel();
