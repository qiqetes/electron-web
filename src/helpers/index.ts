import { app, BrowserWindow, Session, shell } from "electron";
import { join } from "path";
import { AppData } from "../data/appData";
import config from "../config";
import { log, logError, logWarn } from "./loggers";

export const getLocalStoragePrefs = async (mainWindow: BrowserWindow) => {
  log("GETTING LOCALSTORAGE");

  try {
    const settingsRaw = await mainWindow.webContents.executeJavaScript(
      "(localStorage.settings);",
      true
    );

    return JSON.parse(settingsRaw);
  } catch (err) {
    logError("webContents weren't yet initialized", err);
  }
};

/**
 * This is executed every request, we use it to prevent the app from visiting external sites,
 * can be used for any kind of request.
 **/
export const avoidExternalPageRequests = (mainWindow: BrowserWindow) => {
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const isExternalPage =
      !url.startsWith(config.WEBBASE + "/app") &&
      !url.includes("/main_window") && // TODO: improve this
      !url.startsWith("devtools://");

    if (isExternalPage) {
      logWarn(`Blocking external request: ${url}`);

      shell.openExternal(url);

      event.preventDefault();

      return;
    }
  });
};

/**
 * Detects when the service worker is installed and ready to work offline
 */
export const detectWorkerInstallation = (session: Session) => {
  if (AppData.WORKER_INSTALLED) {
    log("Worker already installed");
    return;
  }
  log("Waiting for worker message");
  session.serviceWorkers.on("console-message", (_, messageDetails) => {
    if (messageDetails.message === "@worker:installed") {
      log("WORKER INSTALLED");
    }
    if (messageDetails.message === "@worker:user") {
      AppData.WORKER_INSTALLED = true;
    }
  });
};

/**
 * Returns the path where the data is stored
 */
export const getDBPath = () => {
  return join(app.getPath("userData"), "db.json");
};

export const onWindowResized = (mainWindow: BrowserWindow) => {
  mainWindow.on("resize", () => {
    const [width, height] = mainWindow.getSize();
    AppData.LAST_WINDOW_SIZE = { width, height };
  });
};

export const onWindowMoved = (mainWindow: BrowserWindow) => {
  mainWindow.on("moved", () => {
    const [x, y] = mainWindow.getPosition();
    AppData.LAST_WINDOW_POSITION = { x, y };
  });
};
