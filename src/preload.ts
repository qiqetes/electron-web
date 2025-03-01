import { contextBridge, ipcMain, ipcRenderer } from "electron";
import { BluetoothDevice } from "./core/bluetooth/bluetoothDevice";
import config from "./config";
import { UpdaterEvents } from "./helpers/ipcMainActions";
import { downloadsAPI } from "./api/downloadsAPI";
import { MenuBarLayout } from "./menuBar";

contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,
  appVersion: config.version,
  baseURL: config.WEBBASE,
  loginPath: config.LOGIN_PATH,

  mainLoaded: () => ipcRenderer.send("mainLoaded"),

  checkForUpdates: () => {
    ipcRenderer.send("checkForUpdates");
  },

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
  ) => {
    ipcRenderer.removeAllListeners("toast");
    ipcRenderer.on("toast", callback);
  },

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

  setLogout: () => {
    ipcRenderer.send("setLogout");
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

  checkConnection: () => ipcRenderer.sendSync("checkConnection"),

  // Send navigateToUrl to webapp
  handleElectronRedirect: (callback: (event: Event, route: string) => void) =>
    ipcRenderer.on("modal", callback),

  handleLogout: (callback: () => void) => ipcRenderer.on("logout", callback),
  handleErrorReportModal: (callback: () => void) =>
    ipcRenderer.on("errorReportModal", callback),

  setMenuBar: (menuLayout: MenuBarLayout) =>
    ipcRenderer.send("setMenuBar", menuLayout),
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

contextBridge.exposeInMainWorld("downloadsAPI", downloadsAPI);

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

contextBridge.exposeInMainWorld("bluetoothManagerAPI", {
  startScan: () => {
    ipcRenderer.send("bluetoothStartScan");
  },

  stopScan: (callback: (event: Event, device: BluetoothDevice) => void) =>
    ipcRenderer.on("bluetoothStartScan", callback),

  connectDevice: (id: string) => {
    ipcRenderer.send("connectDevice", id);
  },

  disconnectDevice: (id: string) => {
    ipcRenderer.send("disconnectDevice", id);
  },

  handleReciveDevices: (
    callback: (event: Event, device: BluetoothDevice) => void
  ) => {
    ipcRenderer.removeAllListeners("bluetoothDeviceFound");
    ipcRenderer.on("bluetoothDeviceFound", callback);
  },

  handleReciveStatus: (
    callback: (event: Event, status: BluetoothDevice) => void
  ) => {
    ipcRenderer.on("stateChange", callback);
  },

  handleReciveStatusDevices: (
    callback: (event: Event, device: BluetoothDevice) => void
  ) => {
    ipcRenderer.removeAllListeners("bluetoothDeviceState");
    ipcRenderer.on("bluetoothDeviceState", callback);
  },

  handleHeartRateData: (
    id: string,
    callback: (event: Event, data: any) => void
  ) => {
    ipcRenderer.removeAllListeners("heartRateData-" + id);
    ipcRenderer.on("heartRateData-" + id, callback);
  },
  removeReciveDevices: () => {
    ipcRenderer.removeAllListeners("bluetoothDeviceFound");
  },
  removeNotConnectedDevice: (name: string) => {
    ipcRenderer.send("removeNotConnectedDevice", name);
  },
  syncDevices: () => {
    ipcRenderer.send("syncDevices");
  },
  syncStatus: () => {
    ipcRenderer.send("syncStatus");
  },
  enableAutoScan: () => {
    ipcRenderer.send("enableAutoScan");
  },
  handleBikeData: (id: string, callback: (event: Event, data: any) => void) => {
    ipcRenderer.removeAllListeners("bikeData-" + id);
    ipcRenderer.on("bikeData-" + id, callback);
  },
  handleButtonChange: (
    id: string,
    callback: (event: Event, data: any) => void
  ) => {
    ipcRenderer.removeAllListeners("buttonChange-" + id);
    ipcRenderer.on("buttonChange-" + id, callback);
  },
  readData: (id: string) => {},
  subscribeData: (id: string) => {},
  getDeviceList: () => {},
  getFeatures: () => ipcRenderer.sendSync("getFeatures"),
  getLevelRange: () => ipcRenderer.sendSync("getLevelRange"),
  isAvailableBluetooth: () => ipcRenderer.sendSync("isAvailableBluetooth"),
  setPowerTarget: (power: number) =>
    ipcRenderer.sendSync("setPowerTarget", power),
  stopPowerTarget: () => ipcRenderer.sendSync("stopPowerTarget"),
  setResistanceTarget: (resistance: number) =>
    ipcRenderer.sendSync("setResistanceTarget", resistance),
  autoMode: (enable: boolean) => ipcRenderer.sendSync("autoMode", enable),
  //Chromium api
  chromiumDeviceStatus: (deviceName: string, deviceStatus: string) =>
    ipcRenderer.send("changeDeviceStatus", deviceName, deviceStatus),
  discoverDeviceType: (deviceName: string, uuids: string[]) =>
    ipcRenderer.sendSync("discoverDeviceType", deviceName, uuids),
  readDataFromBuffer: (uuid: string, deviceName: string, data: Buffer) =>
    ipcRenderer.send("readDataFromBuffer", uuid, deviceName, data),
  handleWriteData: (
    id: string,
    callback: (event: Event, data: any) => void
  ) => {
    ipcRenderer.on("writeData-" + id, callback);
  },
});
