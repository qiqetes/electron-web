class AppDataModel {
  WEBAPP_WEBASE: string;
  LOGIN_PATH: string;
  URL: null | string;
  AUTHORIZATION: `Bearer ${string}`;
  XAPPID: "bestcycling";
  APPID: "772529a79cd1b70760da6e4a97dd5189";

  constructor() {
    this.WEBAPP_WEBASE = "http://localhost:8080";
    this.LOGIN_PATH = "/app#/login";
    this.URL = this.WEBAPP_WEBASE + this.LOGIN_PATH;
    this.XAPPID = "bestcycling";
    this.APPID = "772529a79cd1b70760da6e4a97dd5189";
  }
}

export const AppData = new AppDataModel();
