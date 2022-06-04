import { LocalServerInstance } from "../core/LocalServer";
import { AppData } from "../data/appData";
import { SettingsData } from "../data/settingsData";
import { ipcMain } from "electron";
import { api } from "./init";
import { DownloadsData } from "../data/downloadsData";
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
}

export const sendToast = (
  message: string,
  variation: null | "warn" | "error",
  duration: number
) => {
  mainWindow.webContents.send("toast", "SETTINGS SAVED", null, 20);
};
