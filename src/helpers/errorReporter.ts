import { app, crashReporter } from "electron";
import fs from "fs-extra";
import path from "path";
import FormData from "form-data";

import os from "os";
import url from "url";
import { getDBPath } from ".";
import { AppData } from "../data/appData";
import { sendToast } from "./ipcMainActions";
import { log, logError } from "./loggers";
import axios from "axios";

// TODO: Add the automatic crashDump
class ErrorReporterModel {
  errorsPath = app.getPath("crashDumps");
  sessionErrorReportFile = path.join(
    this.errorsPath,
    `session_${Date.now()}.log`
  );
  lastReportDate: number | null = null; // used to debounce and avoid sending multiple reports
  numberOfFailedReports = 0;

  constructor() {
    this.init();
    crashReporter.start({
      submitURL: url.pathToFileURL(this.sessionErrorReportFile).href,
      uploadToServer: false,
    }); // FIXME: don't really know if this is working
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
    const errorString =
      errors.map((e) => e?.toString() || "NULL").join(" ") + "\n";
    fs.appendFile(this.sessionErrorReportFile, errorString).catch((err) => {
      console.log("Error appending to error file", err);
    });
  }

  async sendReport(reportMessage: string) {
    const data = new FormData();
    data.append(
      "Email subject",
      `DESKTOP-REPORT from ${
        AppData.USER?.membership === "gimnasios" ? "gym" : "user"
      }: ${AppData.USER?.name}. Version: ${app.getVersion()}`
    );
    data.append("Email", AppData.USER?.email || "desconocido");
    data.append("User", AppData.USER?.name || "desconocido");
    data.append(
      "Admin user",
      `https://bestcycling.com/admin/users/${AppData.USER?.id}`
    );
    if (AppData.USER?.membership === "gimnasios") {
      data.append(
        "Admin gym",
        `https://bestcycling.com/admin/gyms/${AppData.USER?.id}`
      );
    }
    data.append("Reporte de usuario", reportMessage);
    data.append("userDB.json", fs.createReadStream(getDBPath()));
    data.append("Desktop version", app.getVersion());
    data.append("x-api", "true"); // Necessary to get 200/400 response instead of html
    this.getLastSessionLoggings()
      .map((f) => ({
        filename: path.basename(f),
        content: fs.createReadStream(f),
      }))
      .forEach((f) => data.append(f.filename, f.content));

    const config = {
      method: "post",
      url: "https://bestcycling.com/store/go/sendcontact/",
      headers: {
        ...data.getHeaders(),
      },
      data: data,
    };

    axios(config)
      .then((res) => {
        if (res.statusText === "OK") {
          log("Report sent to server");
          sendOkToast();
        } else {
          logError("Error sending report", res.status);
          sendErrorToast(this.numberOfFailedReports);
          this.numberOfFailedReports++;
        }
      })
      .catch((err) => {
        logError("Error sending report", err);
        sendErrorToast(this.numberOfFailedReports);
        this.numberOfFailedReports++;
      });
  }

  async sendAutoReport(reportMessage: string) {
    const data = new FormData();
    data.append("Email subject", "AUTOMATIC-DESKTOP-REPORT");
    data.append("Email", AppData.USER?.email || "desconocido");
    data.append("User", AppData.USER?.name || "desconocido");
    data.append(
      "Admin user",
      `https://bestcycling.com/admin/users/${AppData.USER?.id}`
    );
    if (AppData.USER?.membership === "gimnasios") {
      data.append(
        "Admin gym",
        `https://bestcycling.com/admin/gyms/${AppData.USER?.id}`
      );
    }
    data.append("React stack message", reportMessage);
    data.append("userDB.json", fs.createReadStream(getDBPath()));
    data.append("Desktop version", app.getVersion());
    data.append("x-api", "true"); // Necessary to get 200/400 response instead of html
    this.getLastSessionLoggings()
      .map((f) => ({
        filename: path.basename(f),
        content: fs.createReadStream(f),
      }))
      .forEach((f) => data.append(f.filename, f.content));

    const config = {
      method: "post",
      url: "https://bestcycling.com/store/go/sendcontact/",
      headers: {
        ...data.getHeaders(),
      },
      data: data,
    };

    axios(config)
      .then((res) => {
        if (res.statusText === "OK") {
          log("Automatic report sent");
        } else {
          logError("Error sending report", res.status);
          this.numberOfFailedReports++;
        }
      })
      .catch((err) => {
        logError("Error sending report", err);
        this.numberOfFailedReports++;
      });
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
}

const sendOkToast = () => {
  sendToast(
    "Reporte enviado correctamente, gracias por tu ayuda!",
    "success",
    5
  );
};

const sendErrorToast = (numOfErrors: number) => {
  sendToast(
    numOfErrors < 2
      ? "Error enviando el reporte, por favor, inténtalo de nuevo más tarde."
      : "Lo sentimos, no se ha podido enviar su reporte de error, puede ponerse en contacto a través de info@bestcycling.es",
    "error",
    5
  );
};

export default ErrorReporterModel;

/// DEPRECATED, with nodemailer
// this.lastReportDate = Date.now();
// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 587,
//   secure: false, // true for 465, false for other ports
//   auth: {
//     user: process.env.EMAIL_ADDRESS,
//     pass: process.env.EMAIL_PASSWORD,
//   },
// });

// try {
//   const info = await transporter.sendMail({
//     from: process.env.EMAIL_ADDRESS,
//     to: ["info@bestcycling.es"],
//     subject: `DESKTOP-REPORT from ${
//       AppData.USER?.membership === "gimnasios" ? "gym" : "user"
//     }: ${AppData.USER?.name}`,
//     text:
//       `El usuario https://bestcycling.com/admin/users/${AppData.USER?.id}, correo ${AppData.USER?.email}, reporta lo siguiente: \n` +
//       reportMessage,
//     attachments: [
//       {
//         filename: "userDB.json",
//         content: fs.createReadStream(getDBPath()),
//       },
//       ...this.getLastSessionLoggings().map((f) => ({
//         filename: path.basename(f),
//         content: fs.createReadStream(f),
//       })),
//     ],
//   });

//   sendToast(
//     "Reporte enviado correctamente, gracias por tu ayuda!",
//     "success",
//     5
//   );
// } catch (err) {
//   logError("Error sending report", err);
//   sendToast(
//     "Error enviando el reporte, por favor, inténtalo de nuevo más tarde",
//     "error",
//     5
//   );
// }
