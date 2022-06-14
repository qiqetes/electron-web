import { LocalServerInstance } from "../core/LocalServer";

import { dialog, ipcMain } from "electron";
import { api, DownloadsData, SettingsData } from "./init";

import { mainWindow } from "../index";
import { AppData } from "../data/appData";
import { filenameStealth } from "./downloadsHelpers";
import { modalFunctions } from "../models/modal.model";

ipcMain.on("saveSetting", (_, setting, value) => {
  SettingsData.saveSetting(setting, value);
});

ipcMain.on("startLocalServer", () =>
  LocalServerInstance.start(SettingsData.downloadsPath)
);

ipcMain.on("stopLocalServer", () => LocalServerInstance.stop());

ipcMain.on("setAuth", (_, auth) => {
  AppData.AUTHORIZATION = `Bearer ${auth}`;
  api.headers.Authorization = AppData.AUTHORIZATION;
});

ipcMain.on(
  "addDownload",
  (
    _,
    trainingClass: TrainingClass,
    mediatype: mediaType = "video_hd",
    timestamp: number | null
  ) => {
    DownloadsData.addToQueue(trainingClass, mediatype, timestamp);
  }
);

ipcMain.on(
  "downloadScheduledTrainingClasses",
  (_, downloadsArray: downloadRequest[]) => {
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

ipcMain.on("changeDownloadsPath", () => {
  const dir = dialog.showOpenDialogSync({ properties: ["openDirectory"] });
  if (!dir?.length) {
    sendToast("No se ha seleccionado ninguna carpeta", "error", 5);
    return;
  }
  showModal(
    "Desea copiar los archivos de descarga del directorio actual al nuevo directorio seleccionado?",
    "Sí, copiar",
    "No, solo cambia el directorio",
    () => {
      DownloadsData.moveDownloadsTo(dir![0]);
    },
    () => {
      DownloadsData.removeAll();
      SettingsData.downloadsPath = dir![0];
    }
  );
});

export const sendToast = (
  message: string,
  variation: null | "warn" | "error" = null,
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
  mainWindow.webContents.send("downloadState", DownloadsData.toWebAppState());
};
