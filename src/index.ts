import { app, session, BrowserWindow, ipcMain, shell } from "electron";

import path from "path";
import os from "os";
import { LocalServerInstance } from "./core/LocalServer";
import { avoidExternalPageRequests } from "./helpers";

import { DownloadsData, init, SettingsData } from "./helpers/init";
import { sendToast } from "./helpers/ipcMainActions";
import { saveAll } from "./helpers/databaseHelpers";
import { log, logError } from "./helpers/loggers";
import { HeartRateDeviceService } from "./core/bluetooth/heartrateDeviceService";
import { AppData } from "./data/appData";
import { filenameStealth } from "./helpers/downloadsHelpers";
import fs from "fs";

declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

if (os.platform() == "win32") app.disableHardwareAcceleration();

app.commandLine.appendSwitch("remote-debugging-port", "8181");

export let mainWindow: BrowserWindow;
const createWindow = async () => {
  await init();

  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    darkTheme: true,
    // icon: icon,
    height: 1000,
    width: 1200,
    minWidth: 1025,
    minHeight: 720,
    backgroundColor: "#151515",
    webPreferences: {
      webSecurity: false, // TODO: Remove this and serve the audio+video files over http
      autoplayPolicy: "no-user-gesture-required",
      nodeIntegration: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.setMenu(null);

  mainWindow
    .loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
    .then(() => log("Main window loaded"))
    .catch((error) => {
      logError("loading the index.html file", error);
    });

  // Open the DevTools.x
  if (process.env.NODE_ENV == "development")
    mainWindow.webContents.openDevTools();

  // Cuando la webapp está realmente cargada, se ejecuta este evento
  mainWindow.once("ready-to-show", () => {
    // mainWindow.setTouchBar(touchBar);
    if (process.env.NODE_ENV == "development") {
      setTimeout(
        () => sendToast("RUNNING IN DEVELOPMENT MODE!", "warn", 20),
        2000
      );
    }
  });

  mainWindow.on("close", async () => await saveAll());

  mainWindow.webContents.on("new-window", (e, url) => {
    const isExternalPlayer =
      url.startsWith(AppData.WEBAPP_WEBASE!) && url.endsWith("/external.html");
    if (isExternalPlayer) return;
    e.preventDefault();
    shell.openExternal(url);
  });

  avoidExternalPageRequests(mainWindow);
  const hrService = new HeartRateDeviceService(ipcMain);
  hrService.registerBluetoothEvents(mainWindow);
};

const reactDevToolsPath = path.join(
  process.cwd(),
  "/extensions/fmkadmapgofadopljbjfkapdkoienihi/4.25.0_3"
);

app.on("ready", async () => {
  if (process.env.NODE_ENV === "development")
    await session.defaultSession.loadExtension(reactDevToolsPath);
  ipcMain.handle("requestDownloadsState", () => DownloadsData.toWebAppState());
  createWindow();
});

app.on("window-all-closed", async () => {
  const download = DownloadsData.getDownloading();
  if (download) {
    log("Removing download before app close");
    const filename = filenameStealth(download.id, download.mediaType);
    fs.unlinkSync(path.join(SettingsData.downloadsPath, filename));
  }

  LocalServerInstance.stop();
  await saveAll();

  app.quit();
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
