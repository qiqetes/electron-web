import config from "../config";
import { DB } from "../helpers/init";
import { log, logError } from "../helpers/loggers";
import pack from "../../package.json";

export class AppDataModel implements AppData {
  WEBAPP_WEBASE!: string;
  LOGIN_PATH!: string;
  URL!: null | string;
  AUTHORIZATION: `Bearer ${string}` = "Bearer ";
  XAPPID = "bestcycling";
  APPID = "772529a79cd1b70760da6e4a97dd5189";
  FIRST_TIME_IT_RUNS!: boolean;
  LAST_VERSION_DOWNLOADED: null | string = null;
  LAST_LOGIN: null | number = null; // timestamp value
  ONLINE = true;
  VERSION = pack.version;

  constructor() {
    this.init();
    log("Running Desktop version: ", this.VERSION);
  }

  init() {
    this.WEBAPP_WEBASE = config.WEBBASE;
    this.LOGIN_PATH = config.LOGIN_PATH;
    this.URL = this.WEBAPP_WEBASE + this.LOGIN_PATH;
    this.FIRST_TIME_IT_RUNS = true;
  }

  getFromDb(): void {
    if (!DB.data?.appData) {
      logError("AppData doesn't exist in the DB");
      return;
    }
    const { FIRST_TIME_IT_RUNS, LAST_VERSION_DOWNLOADED, LAST_LOGIN } =
      DB.data!.appData;
    this.FIRST_TIME_IT_RUNS = FIRST_TIME_IT_RUNS;
    this.LAST_VERSION_DOWNLOADED = LAST_VERSION_DOWNLOADED;
    this.LAST_LOGIN = LAST_LOGIN;
  }

  saveToDb(): void {
    DB.data!.appData = {
      FIRST_TIME_IT_RUNS: this.FIRST_TIME_IT_RUNS,
      LAST_VERSION_DOWNLOADED: this.LAST_VERSION_DOWNLOADED,
      LAST_LOGIN: this.LAST_LOGIN,
    };
  }
}

export const AppData = new AppDataModel();
