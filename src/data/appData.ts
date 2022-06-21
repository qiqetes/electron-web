import * as config from "../config";

class AppDataModel {
  WEBAPP_WEBASE: string;
  LOGIN_PATH: string;
  URL: null | string;
  AUTHORIZATION: `Bearer ${string}` = "Bearer ";
  XAPPID: "bestcycling";
  APPID: "772529a79cd1b70760da6e4a97dd5189";

  constructor() {
    this.WEBAPP_WEBASE = config.WEBBASE;
    this.LOGIN_PATH = config.LOGIN_PATH;
    console.log("res", this.WEBAPP_WEBASE + this.LOGIN_PATH);
    this.URL = this.WEBAPP_WEBASE + this.LOGIN_PATH;
    this.XAPPID = "bestcycling";
    this.APPID = "772529a79cd1b70760da6e4a97dd5189";
  }
}

export const AppData = new AppDataModel();
