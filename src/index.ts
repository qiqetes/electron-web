import { app, BrowserWindow, ipcMain, session, shell } from "electron";
import os from "os";
import { LocalServerInstance } from "./core/LocalServer";
import {
  DB,
  DownloadsData,
  init,
  SettingsData,
  TrainingClassesData,
} from "./helpers/init";
import { sendToast } from "./helpers/ipcMainActions";
import { log, logError } from "./helpers/loggers";

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
  log("STARTING APP: creating window");
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
      nodeIntegration: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.setMenu(null);

  // Get all service workers.
  console.log(session.defaultSession.serviceWorkers.getAllRunning());

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

  mainWindow.webContents.on("new-window", function (e, url) {
    e.preventDefault();
    shell.openExternal(url);
  });
};

app.on("ready", () => {
  ipcMain.handle("requestDownloadsState", () => DownloadsData.toWebAppState());
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", async () => {
  LocalServerInstance.stop();
  await saveAll();
  // if (process.platform !== "darwin") {
  app.quit();
  // }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

const saveAll = async () => {
  await SettingsData.saveToDb();
  await TrainingClassesData.saveToDb();
  DownloadsData.saveToDb();
  await DB.write();
};
