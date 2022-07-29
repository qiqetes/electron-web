import * as fs from "fs-extra";
import { app, crashReporter } from "electron";

import Kitsu from "kitsu";
import { join } from "path";
import { JSONFile, Low } from "@commonify/lowdb";
import { AppData } from "../data/appData";
import DownloadsDataModel from "../data/downloadsData";
import SettingsDataModel from "../data/settingsData";
import TrainingClassesDataModel from "../data/trainingClassesData";
import { setAutoUpdater } from "./updater";
import { log } from "./loggers";
import url from "url";
import dayjs from "dayjs";

// Use JSON file for storage
const file = join(app.getPath("userData"), "db.json");
log("DB file in: ", url.pathToFileURL(file));
const adapter = new JSONFile<DataBase>(file);
export const DB = new Low(adapter);

// Data
export const SettingsData = new SettingsDataModel();
export const TrainingClassesData = new TrainingClassesDataModel();
export const DownloadsData = new DownloadsDataModel();

// Gets the chromium preferences from the old directory if they exist and
// saves them to be accesible from the webapp localStorage
const recoverOldPrefs = () => {
  const userDataPath = app.getPath("userData");
  const oldLocalStoragePath = userDataPath + "/default/Local Storage";
  const newLocalStoragePath = userDataPath + "/Local Storage";

  if (!fs.existsSync(oldLocalStoragePath)) return;

  fs.copySync(oldLocalStoragePath, newLocalStoragePath);
  fs.rmSync(oldLocalStoragePath, { recursive: true, force: true });
  console.log("Successfully imported old prefs");

  app.relaunch();
};

// Processess that should be initialized before the webpage loads
export const init = async () => {
  initErrorHandler();
  await initDB();
  setAutoUpdater();

  setStartingUrl();
  recoverOldPrefs();
};

/// Sets the url starting point depending on gyms scheduler settings
const setStartingUrl = () => {
  const lastLoginValid =
    AppData.LAST_LOGIN &&
    AppData.LAST_LOGIN > dayjs().add(-14, "day").valueOf();

  console.log(AppData.LAST_LOGIN, dayjs().add(-14, "day").valueOf());

  if (lastLoginValid) {
    // No redirection needed, solves problem when the user starts the app without network connection
    // The login page doesn't do the redirection to app if it has no connection
    AppData.URL = AppData.WEBAPP_WEBASE + `/app#/`;
  }

  if (SettingsData.autoStartGymsScheduler) {
    if (process.env.NODE_ENV === "development") {
      AppData.URL =
        AppData.WEBAPP_WEBASE +
        `/app#/gyms/rooms/${SettingsData.defaultRoom}/play`;
    } else {
      AppData.URL =
        AppData.WEBAPP_WEBASE +
        `/app/#/gyms/rooms/${SettingsData.defaultRoom}/play`;
    }
  }
};

const initDB = async () => {
  // Read the DB
  await DB.read();

  // Init database if it doesn't exist
  if (DB.data === null) {
    DB.data = {
      settings: SettingsData,
      trainingClasses: TrainingClassesData,
      downloads: DownloadsData,
      appData: AppData,
    };
    void DB.write();
  } else {
    SettingsData.getFromDb();
    TrainingClassesData.getFromDb();
    DownloadsData.getFromDb();
    AppData.getFromDb();
    AppData.FIRST_TIME_IT_RUNS = false; // FIXME: no es buena manera de hacerlo, se puede haber quedado la BD guardada de una instalación anterior.
  }

  // Start downloads that remained in queue
  DownloadsData.startDownloads();
};

// TODO: Add error handler
const initErrorHandler = () =>
  crashReporter.start({
    submitURL: "",
    uploadToServer: false,
  });

export const api = new Kitsu({
  headers: {
    "Content-Type": "application/vnd.api+json",
    "X-APP-ID": AppData.XAPPID,
    // "X-APP-VERSION": appVersion,
    Authorization: AppData.AUTHORIZATION,
  },
  baseURL: "https://apiv2.bestcycling.es/api/v2",
});
