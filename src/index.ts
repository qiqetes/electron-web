import fs from "fs";
import path from "path";
import os from "os";

import { app, session, BrowserWindow, ipcMain, shell } from "electron";

import { LocalServerInstance } from "./core/LocalServer";
import {
  avoidExternalPageRequests,
  detectWorkerInstallation,
  onWindowMoved,
  onWindowResized,
} from "./helpers";

import { DownloadsData, init, SettingsData } from "./helpers/init";
import { sendToast } from "./helpers/ipcMainActions";
import { saveAll } from "./helpers/databaseHelpers";
import { log, logError } from "./helpers/loggers";
import { HeartRateDeviceService } from "./core/bluetooth/heartrateDeviceService";

import { AppData } from "./data/appData";
import { filenameStealth } from "./helpers/downloadsHelpers";
import { BluetoothManager } from "./core/bluetooth/bluetoothManager";
import { generateInitialMenu } from "./menuBar";
import { setAutoUpdater } from "./helpers/updater";

declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

// Avoid creating two instances of the app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) app.quit();
app.on("second-instance", () => mainWindow?.focus());

if (os.platform() == "win32") app.disableHardwareAcceleration();

app.commandLine.appendSwitch("remote-debugging-port", "8181");
app.commandLine.appendSwitch("enable-web-bluetooth", "true");
app.commandLine.appendSwitch("enable-experimental-web-platform-features");

export let mainWindow: BrowserWindow;
export const BTManager = new BluetoothManager();

const createWindow = async () => {
  await init();

  console.log(AppData.USER);

  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    darkTheme: true,
    // icon: icon,
    height: AppData.LAST_WINDOW_SIZE?.height || 800,
    width: AppData.LAST_WINDOW_SIZE?.width || 1100,
    x: AppData.LAST_WINDOW_POSITION?.x,
    y: AppData.LAST_WINDOW_POSITION?.y,
    minWidth: 1025,
    minHeight: 720,
    backgroundColor: "#151515",
    webPreferences: {
      webSecurity: false, // TODO: Remove this and serve the audio+video files over http
      autoplayPolicy: "no-user-gesture-required",
      nodeIntegration: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      devTools: true,
      // process.env.NODE_ENV == "development" || AppData.USER?.isPreviewTester,
    },
  });
  generateInitialMenu();
  AppData.USER_AGENT = mainWindow.webContents.session.getUserAgent();

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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isExternalPlayer =
      url.startsWith(AppData.WEBAPP_WEBASE!) && url.endsWith("/external.html");
    if (isExternalPlayer)
      return {
        action: "allow",
      };
    shell.openExternal(url);

    return { action: "deny" };
  });

  detectWorkerInstallation(session.defaultSession);
  avoidExternalPageRequests(mainWindow);

  BTManager.registerBluetoothEvents(mainWindow);
  BTManager.loadKnownDevices();
  const hrService = new HeartRateDeviceService(ipcMain);
  hrService.registerBluetoothEvents(mainWindow);

  onWindowResized(mainWindow);
  onWindowMoved(mainWindow);
  try {
    if (process.env.NODE_ENV !== "development") {
      setAutoUpdater();
    }
  } catch (err) {
    logError("Error on auto updater", err);
  }
};

// const reactDevToolsPath = path.join(
//   process.cwd(),
//   "/extensions/fmkadmapgofadopljbjfkapdkoienihi/4.25.0_3"
// );

app.on("ready", async () => {
  if (process.env.NODE_ENV === "development" && app.isPackaged === false) {
    // await session.defaultSession.loadExtension(reactDevToolsPath);
  }
  ipcMain.handle("requestDownloadsState", () =>
    DownloadsData.getDownloadsState()
  );

  createWindow();

  BTManager.bluetoothStateChange();
});

app.on("before-quit", async () => {
  const download = DownloadsData.getDownloading();

  if (download) {
    log("Removing download before app close");

    await DownloadsData.removeDownloading();

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
