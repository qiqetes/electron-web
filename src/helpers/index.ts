import { mainWindow } from "../index";
import { log, logError } from "./loggers";

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
