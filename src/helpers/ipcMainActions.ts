import path from "path";
import url from "url";
import { LocalServerInstance } from "../core/LocalServer";
import { dialog, ipcMain } from "electron";
import { api, DownloadsData, SettingsData } from "./init";
import { mainWindow } from "../index";
import { AppData } from "../data/appData";
import { filenameStealth } from "./downloadsHelpers";
import { modalFunctions } from "../models/modal.model";
import { ErrorReporter, log } from "./loggers";
import { readTagMp3 } from "./mixmeixterHelpers";

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

ipcMain.on("sendReport", (_, report) => {
  ErrorReporter.sendReport(report);
});

ipcMain.on("getAdjustVideoPath", () => {
  const adjustVideoPath = url.pathToFileURL(
    path.join(SettingsData.downloadsPath, "ajustes.mp4")
  ).href;
  return adjustVideoPath;
});
