import { AppData } from "../data/appData";
import { DB, DownloadsData, KnownDevicesData, SettingsData, TrainingClassesData } from "./init";

export const saveAll = async () => {
  AppData.saveToDb();
  SettingsData.saveToDb();
  TrainingClassesData.saveToDb();
  KnownDevicesData.saveToDb();
  DownloadsData.saveToDb();
  await DB.write();
};
