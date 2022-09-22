import { app, crashReporter } from "electron";
import fs from "fs-extra";
import { log, logError } from "./loggers";
import path from "path";
import nodemailer from "nodemailer";
import os from "os";
import { getDBPath } from ".";
import { DB } from "./init";
import { AppData } from "../data/appData";
import { sendToast } from "./ipcMainActions";

// TODO: Add the automatic crashDump
class ErrorReporterModel implements ErrorReporter {
  errorsPath = app.getPath("crashDumps");
  sessionErrorReportFile = path.join(
    this.errorsPath,
    `session_${Date.now()}.log`
  );
  lastReportDate: number | null = null; // used to debounce and avoid sending multiple reports

  constructor() {
    this.init();
    crashReporter.start({ submitURL: this.sessionErrorReportFile }); // FIXME: don't really know if this is working
    // need to force errors
  }

  getLastSessionLoggings(): string[] {
    const files = fs.readdirSync(this.errorsPath);
    const lastSessionFiles = files.filter((f) => f.includes("session_"));

    return lastSessionFiles.map((f) => path.join(this.errorsPath, f));
  }

  init() {
    this.removeOldReports();

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

  async sendReport(reportMessage: string) {
    this.lastReportDate = Date.now();
    // const testAccount = await nodemailer.createTestAccount();
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_ADDRESS,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_ADDRESS,
        to: ["enrique@bestcycling.es"],
        subject: `DESKTOP-REPORT from ${
          AppData.USER?.membership === "gimnasios" ? "gym" : "user"
        }: ${AppData.USER?.name}`,
        text:
          `El usuario https://bestcycling.com/admin/users/${AppData.USER?.id}, correo ${AppData.USER?.email}, reporta lo siguiente: \n` +
          reportMessage,
        attachments: [
          {
            filename: "userDB.json",
            content: fs.createReadStream(getDBPath()),
          },
          ...this.getLastSessionLoggings().map((f) => ({
            filename: path.basename(f),
            content: fs.createReadStream(f),
          })),
        ],
      });

      console.log("Message sent: %s", JSON.stringify(info));
      sendToast(
        "Reporte enviado correctamente, gracias por tu ayuda!",
        "success",
        5
      );
    } catch (err) {
      logError("Error sending report", err);
      sendToast(
        "Error enviando el reporte, por favor, inténtalo de nuevo más tarde",
        "error",
        5
      );
    }
  }

  /**
   * Keep only the ten last reports
   */
  async removeOldReports() {
    const files = fs.readdirSync(this.errorsPath);
    const lastSessionFiles = files.filter((f) => f.includes("session_"));
    const filesToDelete = lastSessionFiles.slice(
      0,
      lastSessionFiles.length - 10
    );
    filesToDelete.forEach((f) => fs.remove(path.join(this.errorsPath, f)));
  }

  getFromDb() {
    if (DB.data?.errorReporter) {
      this.lastReportDate = DB.data.errorReporter.lastReportDate;
    }
  }

  saveToDb() {
    DB.data!.errorReporter = {
      lastReportDate: this.lastReportDate,
    };
  }
}

export const ErrorReporter = new ErrorReporterModel();
