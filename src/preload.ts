import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  isDesktop: true,

  baseURL: "http://localhost:8080",

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

  requestDownloadsState: () => ipcRenderer.invoke("requestDownloadsState"),
});
