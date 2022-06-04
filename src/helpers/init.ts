import * as fs from "fs-extra";
import { app, crashReporter } from "electron";

import Kitsu from "kitsu";
import { join } from "path";
import { JSONFile, Low } from "@commonify/lowdb";
import { AppData } from "../data/appData";
import DownloadsDataModel from "../data/downloadsData";
import SettingsDataModel from "../data/settingsData";
import TrainingClassesDataModel from "../data/trainingClassesData";

// Use JSON file for storage
const file = join(app.getPath("userData"), "db.json");
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

  setStartingUrl();
  recoverOldPrefs();
};

/// Sets the url starting point depending on gyms scheduler settings
const setStartingUrl = () => {
  if (SettingsData.autoStartGymsScheduler) {
    AppData.URL =
      AppData.WEBAPP_WEBASE +
      `/app#/gyms/rooms/${SettingsData.defaultRoom}/play`;
  }
  console.log(AppData.URL);
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
    };
    void DB.write();
  } else {
    SettingsData.getFromDb();
    TrainingClassesData.getFromDb();
    DownloadsData.getFromDb();
  }
};

const initErrorHandler = () =>
  crashReporter.start({
    submitURL: "",
    uploadToServer: false,
  });

export const api = new Kitsu({
  baseUrl: "https://apiv2.bestcycling.es/api/v2",
  headers: {
    "Content-Type": "application/vnd.api+json",
    "X-APP-ID": AppData.XAPPID,
    // "X-APP-VERSION": appVersion,
    Authorization: AppData.AUTHORIZATION,
  },
});
