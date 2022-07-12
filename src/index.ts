import { app, BrowserWindow, ipcMain } from "electron";
import os from "os";
import { LocalServerInstance } from "./core/LocalServer";
import { AppData } from "./data/appData";
import {
  DB,
  DownloadsData,
  init,
  SettingsData,
  TrainingClassesData,
} from "./helpers/init";
import { sendToast } from "./helpers/ipcMainActions";
// import { touchBar } from "./touchbar";
// import icon from "../assets/app-icon.png";

declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

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
      nodeIntegration: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.setMenu(null);
  void mainWindow.loadURL(AppData.URL!);

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
};

app.on("ready", () => {
  ipcMain.handle("requestDownloadsState", () => DownloadsData.toWebAppState());
  void createWindow();
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
    void createWindow();
  }
});

const saveAll = async () => {
  SettingsData.saveToDb();
  TrainingClassesData.saveToDb();
  DownloadsData.saveToDb();
  await DB.write();
};
