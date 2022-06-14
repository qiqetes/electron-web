import { LocalServerInstance } from "../core/LocalServer";

import { dialog, ipcMain } from "electron";
import { api, DownloadsData, SettingsData } from "./init";

import { mainWindow } from "../index";
import { AppData } from "../data/appData";
import { filenameStealth } from "./downloadsHelpers";

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

export const sendToast = (
  message: string,
  variation: null | "warn" | "error" = null,
  duration = 5
) => {
  mainWindow.webContents.send("toast", message, variation, duration);
};

export const informDownloadsState = () => {
  mainWindow.webContents.send("downloadState", DownloadsData.toWebAppState());
};
