import path from "path";
import os from "os";
import url from "url";
import { LocalServerInstance } from "../core/LocalServer";
import { app, dialog, ipcMain } from "electron";
import { api, BinData, DownloadsData, SettingsData } from "./init";
import { mainWindow } from "../index";
import { AppData } from "../data/appData";
import { filenameStealth } from "./downloadsHelpers";
import { modalFunctions } from "../models/modal.model";
import { ErrorReporter, log, logError } from "./loggers";
import { readTagMp3 } from "./mixmeixterHelpers";
import * as fs from "fs";

ipcMain.on("saveSetting", (_, setting, value) => {
  SettingsData.saveSetting(setting, value);
});

ipcMain.on("startLocalServer", () =>
  LocalServerInstance.start(SettingsData.downloadsPath)
);

ipcMain.on("stopLocalServer", () => LocalServerInstance.stop());

ipcMain.on("setAuth", (_, auth) => {
  log("Setting Auth");

  AppData.AUTHORIZATION = `Bearer ${auth}`;
  AppData.LAST_LOGIN = +new Date();
  api.headers.Authorization = AppData.AUTHORIZATION;
  DownloadsData.downloadHelpVideo();
});

ipcMain.on("setUser", (_, user: User) => {
  console.log("setting user", user);
  AppData.USER = user;
});

ipcMain.on("downloadTrainingClass", (_, downloadRequest: downloadRequest) => {
  DownloadsData.addToQueue(downloadRequest);
});

ipcMain.on(
  "downloadScheduledTrainingClasses",
  (_, downloadsArray: downloadRequest[]) => {
    if (!SettingsData.download_scheduled_training_classes) return;
    DownloadsData.addMultipleToQueue(downloadsArray);
  }
);

ipcMain.on("removeAllDownloads", () => {
  DownloadsData.removeAll();
});

ipcMain.on("importDownloads", () => {
  const dir = dialog.showOpenDialogSync({ properties: ["openDirectory"] });
  if (dir) {
    DownloadsData.importFromFolder(dir[0]);
  }
});

ipcMain.on("getMediaUrl", (event, id, media) => {
  event.returnValue = `http://127.0.0.1:${
    LocalServerInstance.port
  }/offline/${filenameStealth(id, media)}`;
});

ipcMain.on("deleteDownload", (event, id, media: mediaType) => {
  DownloadsData.removeDownload(id, media);
});

ipcMain.on("deleteDownloads", () => {
  DownloadsData.removeAll();
});

ipcMain.handle("changeDownloadsPath", (): string => {
  const dir = dialog.showOpenDialogSync({
    properties: ["openDirectory"],
    defaultPath: SettingsData.downloadsPath,
  });
  if (!dir?.length) {
    sendToast("No se ha seleccionado ninguna carpeta", "error", 5);
    return SettingsData.downloadsPath;
  }
  log("Downloads path changed by user to: " + dir[0]);

  if (dir[0] === SettingsData.downloadsPath) {
    sendToast(
      "La carpeta seleccionada es destino actual de las descargas",
      "warn"
    );
    return SettingsData.downloadsPath;
  }

  showModal(
    "Desea copiar los archivos de descarga del directorio actual al nuevo directorio seleccionado?",
    "Sí, copiar",
    "No, solo cambia el directorio",
    () => {
      DownloadsData.moveDownloadsTo(dir[0]);
    },
    () => {
      DownloadsData.removeAll();
      SettingsData.downloadsPath = dir[0];
    }
  );

  return dir[0];
});

ipcMain.on("restoreDefaults", () => {
  log("Restoring defaults");

  DownloadsData.init();
  SettingsData.init();
  AppData.init();

  console.log(DownloadsData.offlineTrainingClasses);

  // borrar localStorage
  mainWindow.webContents.session.clearStorageData();
});

ipcMain.on("changeConnectionStatus", (event, online: boolean) => {
  if (AppData.ONLINE != online) {
    AppData.ONLINE = online;
    log(`Changed status connection to: ${online ? "online" : "offline"}`);
    if (online) sendToast("Se ha restaurado la conexión");
    else if (!online) sendToast("Pasando a modo offline", "warn");
  }
  if (online) {
    DownloadsData.startDownloads();
  }
});

ipcMain.on("readTagMp3", async (event, file: string, pathFile: string) => {
  const value = await readTagMp3(file, pathFile);

  event.returnValue = value;
});

export const sendToast = (
  message: string,
  variation: null | "warn" | "error" | "success" = null,
  duration = 5
) => {
  mainWindow.webContents.send("toast", message, variation, duration);
};

export type UpdaterEvents =
  | { type: "update_found"; version: string }
  | { type: "update_downloading"; progress: number }
  | { type: "update_downloaded" }
  | { type: "update_installing" }
  | { type: "update_error"; error: string };
export const sendUpdaterEvent = (updaterEvent: UpdaterEvents) => {
  if (!AppData.MAIN_LOADED)
    preRendererCachedActions.push(() =>
      mainWindow.webContents.send("updaterEvent", updaterEvent)
    );
  mainWindow.webContents.send("updaterEvent", updaterEvent);
};

export const showModal = (
  message: string,
  textOk = "OK",
  textCancel = "Cancel",
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  callbackOk = () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  callbackCancel = () => {}
) => {
  modalFunctions.callbackOk = callbackOk;
  modalFunctions.callbackCancel = callbackCancel;
  mainWindow.webContents.send("modal", message, textOk, textCancel);
};
ipcMain.on("modalOk", () => modalFunctions.callbackOk());
ipcMain.on("modalCancel", () => modalFunctions.callbackCancel());

export const informDownloadsState = () => {
  mainWindow.webContents.send("downloadsState", DownloadsData.toWebAppState());
};

// Just gives the information about one download (the one downloading)
// to improve the performance?
export const informDownloadState = () => {
  mainWindow.webContents.send("downloadState", DownloadsData.getDownloading());
};

export const informConversionState = (conversionState: conversionStateWebapp) => {
  mainWindow.webContents.send("conversionState", conversionState);
}

/**
 * Will notify the renderer process that main process changed a setting
 */
export const informSettingState = (settingCode: string, value: any) => {
  mainWindow.webContents.send("settingChange", settingCode, value);
};

ipcMain.on("sendReport", (_, report) => {
  ErrorReporter.sendReport(report);
});

ipcMain.on("getAdjustVideoPath", () => {
  const adjustVideoPath = url.pathToFileURL(
    path.join(SettingsData.downloadsPath, "ajustes.mp4")
  ).href;
  return adjustVideoPath;
});

ipcMain.on("getSetting", (event, setting) => {
  log("Webapp ask for setting: " + setting);
  let toReturn: any;
  switch (setting) {
    case "default_room":
      toReturn = SettingsData.defaultRoom;
      break;
    case "updated_to_life":
      toReturn = SettingsData.updated_to_life;
      break;
    case "C1": {
      toReturn = SettingsData.downloadsPath;
      break;
    }
    case "C7":
      toReturn = SettingsData.playerVolume;
      break;
    case "C8":
      toReturn = SettingsData.gymsLogoPath;
      break;
    case "C9":
      toReturn = SettingsData.offlineResolution === "hd" ? "1" : "0";
      break;
    case "C10":
      toReturn = SettingsData.resolutionCreateMP4 === "hd" ? "1" : "0";
      break;
    case "C11":
      toReturn = SettingsData.autoStartGymsScheduler ? "1" : "0";
      break;
    case "C13":
      toReturn = SettingsData.maxDownloadsSize.toString();
      break;
    case "waiting_music_file":
      toReturn = SettingsData.waitingMusicPath;
      break;
    case "C14":
      toReturn = SettingsData.download_scheduled_training_classes ? "1" : "0";
      break;
    case "videoHD":
      toReturn = SettingsData.videoHD;
      break;
    case "C22":
      toReturn = SettingsData.showMonitorView ? "1" : "0";
      break;
    case "show_external_setup_video":
      toReturn = SettingsData.show_external_setup_video ? "1" : "0";
      break;
    case "ask_graph_intro_video":
      toReturn = SettingsData.ask_graph_intro_video ? "1" : "0";
      break;
    default:
      toReturn = null;
  }
  event.returnValue = toReturn;
});

ipcMain.on("stopConversion", () => BinData.processes['ffmpeg'].kill());

ipcMain.on("removeTempMp3", (_, fileName) => {
  if (!fileName) return;

  fs.rm(path.join(app.getPath("temp"), fileName), (err) => {
    if (err) {
      logError(`Couldn't delete file for download: ${fileName}, error: `, err);
      return;
    }

    log("removeTempMp3");
  });
});

ipcMain.handle("convertToMp3", async (_, url: string) => {
  const ffmpegBin = os.platform() === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const name = url.split('/').reverse()[0].split(".")[0];
  const date = new Date().getTime();

  const outPutPath = path.join(app.getPath("temp"), `${name}_${date}.mp3`);

  const isValid = await new Promise((resolve, reject) => {
    log("Getting data from file...");

    const data = BinData.executeBinary(ffmpegBin, ["-i", url]);
    const buff: number[] = [];

    data.stderr.on("data", (data) => buff.push(data.toString()));
    data.stderr.once("end", () => {
      // Formats buffer as an array with valid words
      const output = buff
        .join()
        .split(/\s|\n/)
        .filter((out) => out);

      // Calculate index of Input word to find extension
      const firstEntry = output.indexOf("Input");
      const entryPoint = output.indexOf("Input", firstEntry + 1) + 2;
      const valid = output[entryPoint]?.includes("wav");

      resolve(valid);
    });
    data.stdout.once("error", (err) => {
      logError("Error getting data from file: ", err);
      reject(false);
    });
  });

  if (!isValid) {
    logError(
      "convertToMp3: isValid => Error converting to mp3. Entry extension must be wav"
    );
    return "";
  }

  const toSeconds = (date: string) => {
    const times = [3600, 60, 1];
    let seconds = 0;

    times.forEach((time, index) => seconds += parseInt(date[index]) * time);
    return seconds;
  }

  let durationInSeconds = 0;

  return await new Promise((resolve, reject) => {
    log("Creating mp3 from wav...");

    const execution = BinData.executeBinary(ffmpegBin, [
      "-y",
      "-i",
      url,
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "320k",
      "-ar",
      "44100",
      "-write_xing",
      "false",
      "-f",
      "mp3",
      outPutPath,
    ]);

    execution.stderr.on("data", (data) => {
      // Looking for Duration in console err output
      const buff = data.toString().split(' ');
      const durationIndex = buff.indexOf('Duration:');

      if (durationIndex !== -1) {
        const duration = buff[durationIndex + 1].split(',')[0].split(':');
        durationInSeconds = toSeconds(duration);
        return;
      }

      // Looking for Time in console err output
      const timeBuff = buff.join('=').split('=');
      const timeIndex = timeBuff.indexOf('time');

      if (timeIndex !== -1) {
        // Convert times to percent
        const time = timeBuff[timeIndex + 1].split(':');
        const seconds = toSeconds(time);

        const percent = Math.trunc(100 * seconds / durationInSeconds);

        log(`Converting => totalSeconds: ${durationInSeconds} | currentSeconds: ${seconds} | percent: ${percent}`)
        informConversionState({ percent });
      }
    });
    
    execution.stderr.once("end", () => {
      resolve(outPutPath);
    });

    execution.on("exit", () => {
      if (!execution.killed) return;

      delete BinData.processes['ffmpeg'];
      fs.rm(outPutPath, (err) => {
        if (err) {
          logError(`Couldn't delete file for download: ${outPutPath}, error: `, err);
          return;
        }

        log("removeTempMp3");
      });
    });

    execution.stderr.once("error", (err) => {
      logError("convertToMp3: Error converting to mp3: ", err);
      reject("");
    });
  });
});

// There are some actions that need to comunicate with the renderer process
// but they are launched before the execution of the renderer process
// so we need to store the actions and execute them when the renderer process
// is ready
const preRendererCachedActions: (() => void)[] = [];
ipcMain.once("mainLoaded", () => {
  AppData.MAIN_LOADED = true;
  preRendererCachedActions.forEach((action) => action());
});
