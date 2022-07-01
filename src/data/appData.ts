import { DB } from "../helpers/init";
import { logError } from "../helpers/loggers";
import * as config from "../config";

class AppDataModel implements AppData {
  WEBAPP_WEBASE: string;
  LOGIN_PATH: string;
  URL: null | string;
  AUTHORIZATION: `Bearer ${string}` = "Bearer ";
  XAPPID: "bestcycling";
  APPID: "772529a79cd1b70760da6e4a97dd5189";
  FIRST_TIME_IT_RUNS: boolean;
  LAST_VERSION_DOWNLOADED: null | string = null;

  constructor() {
    this.WEBAPP_WEBASE = config.WEBBASE;
    this.LOGIN_PATH = config.LOGIN_PATH;
    console.log("res", this.WEBAPP_WEBASE + this.LOGIN_PATH);
    this.URL = this.WEBAPP_WEBASE + this.LOGIN_PATH;
    this.XAPPID = "bestcycling";
    this.APPID = "772529a79cd1b70760da6e4a97dd5189";
    this.FIRST_TIME_IT_RUNS = true;
  }
  getFromDb(): void {
    if (!DB.data?.appData) {
      logError("AppData doesn't exist in the DB");
      return;
    }
    this.FIRST_TIME_IT_RUNS = DB.data!.appData.FIRST_TIME_IT_RUNS;
    this.LAST_VERSION_DOWNLOADED = DB.data!.appData.LAST_VERSION_DOWNLOADED;
  }

  saveToDb(): void {
    DB.data!.appData = {
      FIRST_TIME_IT_RUNS: this.FIRST_TIME_IT_RUNS,
      LAST_VERSION_DOWNLOADED: this.LAST_VERSION_DOWNLOADED,
    };
  }
}

export const AppData = new AppDataModel();
