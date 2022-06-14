import { app, BrowserWindow, ipcMain } from "electron";
import { LocalServerInstance } from "./core/LocalServer";
import { AppData } from "./data/appData";
import {
  DB,
  DownloadsData,
  init,
  SettingsData,
  TrainingClassesData,
} from "./helpers/init";
import { showModal } from "./helpers/ipcMainActions";

declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

export let mainWindow: BrowserWindow;
const createWindow = async () => {
  await init();

  mainWindow = new BrowserWindow({
    height: 1000,
    width: 1200,
    minWidth: 1025,
    backgroundColor: "#151515",
    webPreferences: {
      webSecurity: false, // TODO: Remove this and serve the audio+video files over http
      nodeIntegration: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  void mainWindow.loadURL(AppData.URL!);

  // Open the DevTools.x
  mainWindow.webContents.openDevTools();

  // Cuando la webapp está realmente cargada, se ejecuta este evento
  mainWindow.once("ready-to-show", () => {
    setTimeout(
      () =>
        showModal(
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
          "Sí",
          "No",
          () => console.log("Clicked OK"),
          () => console.log("Clicked NOPE")
        ),
      4000
    );
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
  DB.data = {
    settings: SettingsData,
    trainingClasses: TrainingClassesData,
    downloads: DownloadsData,
  };
  await DB.write();
};
