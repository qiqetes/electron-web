import { LocalServerInstance } from "../core/LocalServer";
import { AppData } from "../data/appData";

import { ipcMain } from "electron";
import { api, DownloadsData, SettingsData } from "./init";

import { mainWindow } from "../index";

export default function ipcMainActions() {
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
}

export const sendToast = (
  message: string,
  variation: null | "warn" | "error" = null,
  duration = 5
) => {
  mainWindow.webContents.send("toast", message, variation, duration);
};

export const informDownloads = () => {
  mainWindow.webContents.send("downloads", DownloadsData);
};
