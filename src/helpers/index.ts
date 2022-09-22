import { app, shell } from "electron";
import { join } from "path";
import config from "../config";
import { mainWindow } from "../index";
import { log, logError, logWarn } from "./loggers";

export const getLocalStoragePrefs = async () => {
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
export const avoidExternalPageRequests = () => {
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
 * Returns the path where the data is stored
 */
export const getDBPath = () => {
  return join(app.getPath("userData"), "db.json");
};
