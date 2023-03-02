import pack from "../../package.json";
import config from "../config";
import { DB } from "../helpers/init";

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
  USER: User | null = null;
  MAIN_LOADED = false;
  LAST_WINDOW_SIZE: null | { width: number; height: number } = null;
  LAST_WINDOW_POSITION: null | { x: number; y: number } = null;
  WORKER_INSTALLED = false;

  constructor() {
    this.init();
  }

  init() {
    this.WEBAPP_WEBASE = config.WEBBASE;
    this.LOGIN_PATH = config.LOGIN_PATH;
    this.URL = this.WEBAPP_WEBASE + this.LOGIN_PATH;
    this.FIRST_TIME_IT_RUNS = true;
  }

  getFromDb(): void {
    if (!DB.data?.appData) {
      return;
    }
    const {
      FIRST_TIME_IT_RUNS,
      LAST_VERSION_DOWNLOADED,
      LAST_LOGIN,
      USER,
      LAST_WINDOW_SIZE,
      LAST_WINDOW_POSITION,
      WORKER_INSTALLED,
    } = DB.data!.appData;
    this.FIRST_TIME_IT_RUNS = FIRST_TIME_IT_RUNS;
    this.LAST_VERSION_DOWNLOADED = LAST_VERSION_DOWNLOADED;
    this.LAST_LOGIN = LAST_LOGIN;
    this.USER = USER;
    this.LAST_WINDOW_SIZE = LAST_WINDOW_SIZE;
    this.LAST_WINDOW_POSITION = LAST_WINDOW_POSITION;
    this.WORKER_INSTALLED = WORKER_INSTALLED;
  }

  saveToDb(): void {
    DB.data!.appData = {
      FIRST_TIME_IT_RUNS: this.FIRST_TIME_IT_RUNS,
      LAST_VERSION_DOWNLOADED: this.LAST_VERSION_DOWNLOADED,
      LAST_LOGIN: this.LAST_LOGIN,
      USER: this.USER,
      LAST_WINDOW_SIZE: this.LAST_WINDOW_SIZE,
      LAST_WINDOW_POSITION: this.LAST_WINDOW_POSITION,
      WORKER_INSTALLED: this.WORKER_INSTALLED,
    };
  }
}

export const AppData = new AppDataModel();
