import { ipcRenderer } from "electron";

export const downloadsAPI = {
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

  /**
   * Recibe una trainingClass con todos sus datos (media y progresión) para almanecenar en base de datos de clases offline.
   * @param trainingClass
   */
  updateTrainingClass: (trainingClass: TrainingClass) =>
    ipcRenderer.send("updateTrainingClass", trainingClass),
};
