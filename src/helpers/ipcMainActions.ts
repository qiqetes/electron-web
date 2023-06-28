import path from "path";
import url from "url";
import { LocalServerInstance } from "../core/LocalServer";
import { app, dialog, ipcMain, net } from "electron";
import {
  api,
  BinData,
  DownloadsData,
  KnownDevicesData,
  SettingsData,
  TrainingClassesData,
} from "./init";
import { mainWindow } from "../index";
import { AppData } from "../data/appData";
import { filenameStealth } from "./downloadsHelpers";
import { modalFunctions } from "../models/modal.model";
import { ErrorReporter, log, logError } from "./loggers";
import { readTagMp3 } from "./mixmeixterHelpers";
import * as fs from "fs";
import { MenuBarLayout, generateMenuBar } from "../menuBar";
import ConversionDataImpl from "../../src/data/conversionData";

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
ipcMain.on("setLogout", (_) => {
  log("Setting Logout");
  AppData.AUTHORIZATION = `Bearer `;
  AppData.USER = null;
  api.headers.Authorization = AppData.AUTHORIZATION;
});
ipcMain.on(
  "setUser",
  (
    _,
    user: {
      id: number;
      email: string;
      sex: string;
      name: string;
      membership: string;
      tags: string[];
    }
  ) => {
    AppData.USER = {
      ...user,
      isBetaTester: user.tags.includes("beta"),
      isPreviewTester: user.tags.includes("revision"),
    };
  }
);

ipcMain.on("downloadTrainingClass", (_, downloadRequest: downloadRequest) => {
  DownloadsData.addToQueue(downloadRequest);
});

ipcMain.on("updateTrainingClass", (_, trainingClass) => {
  TrainingClassesData.addTrainingClass(trainingClass);
});

ipcMain.on(
  "downloadScheduledTrainingClasses",
  (_, downloadsArray: downloadRequest[]) => {
    if (!SettingsData.download_scheduled_training_classes) return;
    DownloadsData.addMultipleToQueue(downloadsArray);
  }
);

ipcMain.on("removeMyTrainingClasses", (_, data: TrainingClass[]) => {
  DownloadsData.removeMyTrainingClasses(data);
});

ipcMain.on("removeMyTrainingClass", (_, tc: TrainingClass) => {
  DownloadsData.removeMyTrainingClass(tc);
});

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
    "¿Desea copiar los archivos de descarga del directorio actual al nuevo directorio seleccionado?",
    "Sí, copiar archivos",
    "No, solo cambiar el directorio",
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
  KnownDevicesData.init();
  // borrar localStorage
  mainWindow.webContents.session.clearStorageData();

  app.relaunch();
  app.exit();
});

ipcMain.on("changeConnectionStatus", (event, online: boolean) => {
  if (AppData.ONLINE != online) {
    AppData.ONLINE = online;
    log(`Changed status connection to: ${online ? "online" : "offline"}`);
    if (online) {
      DownloadsData.startDownloads();
      sendToast("Se ha restaurado la conexión");
    } else if (!online) {
      sendToast("Pasando a modo offline", "warn");
    }
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
  mainWindow.webContents.send(
    "downloadsState",
    DownloadsData.getDownloadsState()
  );
};

// Just gives the information about one download (the one downloading)
// to improve the performance?
export const informDownloadState = () => {
  mainWindow.webContents.send("downloadState", DownloadsData.getDownloading());
};

export const informConversionState = (percent: number) => {
  mainWindow.webContents.send("conversionState", percent);
};

/**
 * Will notify the renderer process that main process changed a setting
 */
export const informSettingState = (settingCode: string, value: any) => {
  mainWindow.webContents.send("settingChange", settingCode, value);
};

ipcMain.on("sendReport", (_, report) => {
  ErrorReporter.sendReport(report);
});
ipcMain.on("sendAutoReport", (_, report) => {
  ErrorReporter.sendAutoReport(report);
});

ipcMain.on("getAdjustVideoPath", (event) => {
  const adjustVideoPath = url.pathToFileURL(
    path.join(SettingsData.downloadsPath, "ajustes.mp4")
  ).href;
  event.returnValue = adjustVideoPath;
});

ipcMain.on("workerInstalled", (event) => {
  event.returnValue = AppData.WORKER_INSTALLED;
});

ipcMain.on("notifyWorkerInstalled", () => {
  AppData.WORKER_INSTALLED = true;
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

ipcMain.on("stopConversion", () => {
  BinData.removeProcess("ffmpeg");
});

ipcMain.on("removeTempMp3", (_, fileName) => {
  if (!fileName) return;

  const _path = path.join(app.getPath("temp"), fileName);

  if (fs.existsSync(_path)) {
    fs.rm(_path, (err) => {
      if (err) {
        logError(`Couldn't delete file for download: ${fileName}, error: `, err);
        return;
      }

      log("removeTempMp3");
    });
  }
});

ipcMain.handle("convertToMp3", async (_, url: string) => {
  const conversion = new ConversionDataImpl(url);
  const mp3Status = await conversion.checkExtension();

  if (mp3Status) {
    return mp3Status;
  }

  return await conversion.convert((value: number) => {
    informConversionState(value);
  });
});

ipcMain.on("checkConnection", (event, id, media) => {
  event.returnValue = net.isOnline();
});

ipcMain.on("setMenuBar", (_, layout: MenuBarLayout) => {
  generateMenuBar(layout);
});

// There are some actions that need to comunicate with the renderer process
// but they are launched before the execution of the renderer process
// so we need to store the actions and execute them when the renderer process
// is ready.
// MainLoaded is executed when the preferences context is loaded (login done).
const preRendererCachedActions: (() => void)[] = [];
ipcMain.once("mainLoaded", () => {
  AppData.MAIN_LOADED = true;
  preRendererCachedActions.forEach((action) => action());
});
