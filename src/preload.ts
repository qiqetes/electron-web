import { contextBridge, ipcRenderer } from "electron";
import config from "./config";
import { UpdaterEvents } from "./helpers/ipcMainActions";

contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
  appVersion: config.version,
  baseURL: config.WEBBASE,
  loginPath: config.LOGIN_PATH,

  mainLoaded: () => ipcRenderer.send("mainLoaded"),

  // Saves settings from webapp to SettingsData
  saveSetting: (setting: string, value: any) => {
    ipcRenderer.send("saveSetting", setting, value);
  },

  // Send toast notification
  handleToast: (
    callback: (
      event: Event,
      text: string,
      variant?: string,
      seconds?: number
    ) => void
  ) => ipcRenderer.on("toast", callback),

  // Send modal notification
  handleModal: (
    callback: (
      event: Event,
      text: string,
      textOk?: string,
      textCancel?: string
    ) => void
  ) => ipcRenderer.on("modal", callback),

  handleUpdaterEvent: (
    callback: (event: Event, updaterEvent: UpdaterEvents) => void
  ) => ipcRenderer.on("updaterEvent", callback),

  modalOk: () => ipcRenderer.send("modalOk"),
  modalCancel: () => ipcRenderer.send("modalCancel"),

  setAuth: (auth: string) => {
    ipcRenderer.send("setAuth", auth);
  },

  restoreDefaults: () => {
    ipcRenderer.send("restoreDefaults");
  },

  changeConnectionStatus: (online: boolean) => {
    ipcRenderer.send("changeConnectionStatus", online);
  },

  sendReport: (report: string) => {
    ipcRenderer.send("sendReport", report);
  },
  sendAutoReport: (report: string) => {
    ipcRenderer.send("sendReport", report);
  },

  setUser: (user: User) => {
    ipcRenderer.send("setUser", user);
  },

  getSetting: (setting: string) => ipcRenderer.sendSync("getSetting", setting),

  handleSettingChange: (
    callback: (event: Event, setting: string, value: any) => void
  ) => {
    ipcRenderer.on("settingChange", callback);
  },

  workerInstalled: () => {
    return ipcRenderer.sendSync("workerInstalled");
  },

  notifyWorkerInstalled: () => {
    ipcRenderer.send("notifyWorkerInstalled");
  },
});

contextBridge.exposeInMainWorld("conversionAPI", {
  stopConversion: () => ipcRenderer.send("stopConversion"),
  removeTempMp3: (fileName: string) =>
    ipcRenderer.send("removeTempMp3", fileName),
  convertToMp3: (url: string) => ipcRenderer.invoke("convertToMp3", url),

  handleConversionState: (
    callback: (event: Event, percent: number) => void
  ) => {
    ipcRenderer.on("conversionState", callback);
  },
});

contextBridge.exposeInMainWorld("downloadsAPI", {
  startLocalServer: () => ipcRenderer.send("startLocalServer"),
  stopLocalServer: () => ipcRenderer.send("stopLocalServer"),

  downloadScheduledTrainingClasses: (downloadRequests: downloadRequest[]) =>
    ipcRenderer.send("downloadScheduledTrainingClasses", downloadRequests),
  downloadTrainingClass: (
    trainingClass: TrainingClass,
    mediaType: mediaType
  ) => {
    ipcRenderer.send("downloadTrainingClass", {
      trainingClass,
      mediaType,
      timestamp: null,
    });
  },

  changeDownloadsPath: () => ipcRenderer.invoke("changeDownloadsPath"),
  importDownloads: () => ipcRenderer.send("importDownloads"),
  deleteDownloads: () => ipcRenderer.send("deleteDownloads"),
  deleteDownload: (id: number, media: mediaType = "video_hd") =>
    ipcRenderer.send("deleteDownload", id, media),

  handleDownloadsState: (
    callback: (event: Event, state: downloadsStateWebapp) => void
  ) => {
    ipcRenderer.on("downloadsState", callback);
  },
  handleDownloadState: (
    callback: (event: Event, state: downloadsStateWebapp) => void
  ) => {
    ipcRenderer.on("downloadState", callback);
  },

  getMediaUrl: (id: number, media: mediaType = "video_hd") =>
    ipcRenderer.sendSync("getMediaUrl", id, media),

  getAdjustVideoPath: () => ipcRenderer.sendSync("getAdjustVideoPath"),
  requestDownloadsState: () => ipcRenderer.invoke("requestDownloadsState"),
});

contextBridge.exposeInMainWorld("mixmeixterApi", {
  readTagMp3: (file: string, path: string) => {
    return ipcRenderer.sendSync("readTagMp3", file, path);
  },
});

contextBridge.exposeInMainWorld("bluetoothAPI", {
  handleReceiveHRDevices: (
    callback: (event: Event, device: Electron.BluetoothDevice) => void
  ) => ipcRenderer.on("hrDevicesList", callback),
  hrDeviceSelected: (deviceName: string) =>
    ipcRenderer.send("hrDeviceSelected", deviceName),
  hrDeviceSelectionCancelled: () =>
    ipcRenderer.send("hrDeviceSelectionCancelled"),
});
