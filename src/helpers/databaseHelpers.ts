import { AppData } from "../data/appData";
import { DB, DownloadsData, SettingsData, TrainingClassesData } from "./init";

export const saveAll = async () => {
  AppData.saveToDb();
  SettingsData.saveToDb();
  TrainingClassesData.saveToDb();
  DownloadsData.saveToDb();
  await DB.write();
};
