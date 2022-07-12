import path = require("path");
import url from "url";
import {
  downloadFromFile,
  filenameStealth,
  isValidDownloadFile,
} from "../helpers/downloadsHelpers";
import { http, https, RedirectableRequest } from "follow-redirects";
import * as fs from "fs";
import { OfflineTrainingClass } from "../models/offlineTrainingClass";
import { DB, SettingsData, TrainingClassesData } from "../helpers/init";
import { informDownloadsState, sendToast } from "../helpers/ipcMainActions";
import { AppData } from "./appData";
import { log, logError, logWarn } from "../helpers/loggers";

class DownloadsDataModel implements DownloadsData {
  offlineTrainingClasses: { [id: string]: OfflineTrainingClass } = {}; // [id: id+"-"+mediaType]
  trainingClassesScheduled: number[] = [];
  isDownloading = false;
  currentTask: RedirectableRequest<any, any> | null = null;
  currentDownload: OfflineTrainingClass | null = null;

  constructor() {
    this.initDownloadsPath();
  }

  addToQueue(dr: downloadRequest, inform = true) {
    // Check if already in queue
    const offlineTraining =
      this.offlineTrainingClasses[dr.trainingClass.id + "-" + dr.mediaType];
    const status = offlineTraining?.status;
    if (offlineTraining && status === "none") {
      offlineTraining.status = "queued";
    } else if (offlineTraining) {
      // Update to the new timestamp
      offlineTraining.timestamp = dr.timestamp;
      return;
    }

    const id = dr.trainingClass.id.toString();
    const offlineTrainingClass = new OfflineTrainingClass(
      id,
      dr.mediaType,
      dr.timestamp
    );

    TrainingClassesData.addTraining(dr.trainingClass, false);

    this.offlineTrainingClasses[id + "-" + dr.mediaType] = offlineTrainingClass;
    if (inform) {
      informDownloadsState();
      this.startDownloads();
    }
  }

  initDownloadsPath() {
    const downloadsPath = SettingsData.downloadsPath;
    fs.mkdirSync(downloadsPath, { recursive: true });
  }

  addMultipleToQueue(downloadsArray: downloadRequest[]) {
    downloadsArray.forEach((v) => this.addToQueue(v, false));
    this.startDownloads();
    informDownloadsState();
  }

  getQueued(): OfflineTrainingClass[] {
    return Object.values(this.offlineTrainingClasses).filter(
      (v) => v.status === "queued"
    );
  }

  getDownloaded(): OfflineTrainingClass[] {
    return Object.values(this.offlineTrainingClasses).filter(
      (v) => v.status === "downloaded"
    );
  }

  getFirstQueued(): OfflineTrainingClass | null {
    const queuedTrainingClasses = this.getQueued();
    if (!queuedTrainingClasses.length) return null;

    return Object.values(queuedTrainingClasses).sort((a, b) => {
      // assign a value depending on timestamp and number of tries
      const valA: number =
        a.retries >= 5 ? Infinity : a.retries * (a?.timestamp || 0);
      const valB: number =
        b.retries >= 5 ? Infinity : b.retries * (b?.timestamp || 0);
      return valA - valB;
    })[0];
  }

  stopDownloading(): void {
    this.isDownloading = false;
    if (this.currentTask) this.currentTask.abort();
  }

  startDownloads(): void {
    console.log("STARTING DOWNLOADS ⬇️");
    this.downloadNext();
  }

  throwErrorDownloading(
    download: OfflineTrainingClass,
    reason: string,
    keepDownloading: boolean,
    args?: any[]
  ): void {
    if (args) logError(reason, ...args);
    else logError(reason);

    sendToast("Error al descargar clase", "error", 3);
    this.isDownloading = false;
    download.retries++;
    if (download.retries >= 5) download.status = "error";
    if (keepDownloading) this.downloadNext();
    throw new Error();
  }

  // FUNCTION THAT WILL START DOWNLOADING A CLASS
  async downloadNext() {
    // Check if already downloading
    if (this.isDownloading) return;
    this.isDownloading = true;

    // Check if there are classes waiting to be downloaded in the queue
    const download = this.getFirstQueued();
    if (!download) {
      this.isDownloading = false;
      return;
    }

    // Check if near the download limit
    if (this.totalDownloadsSize() > SettingsData.maxDownloadsSize * 0.8) {
      const toDelete = this.getDeleteCandidate();
      if (toDelete) {
        this.removeDownload(toDelete.id, toDelete.mediaType, false);
      }
    }

    this.currentDownload = download;

    // Check that the download hasn't failed already 5 times
    if (download.retries > 5) {
      sendToast("Error al descargar clase", "error", 3);
      download.status = "error";
      this.isDownloading = false;
      return;
    }

    // FIXME: intentar quitar el await de aquí
    // Get all the trainingClass data from the api.
    const trainingClass: TrainingClass | null =
      await TrainingClassesData.getFullTrainingClass(download.id);

    if (!trainingClass) {
      this.throwErrorDownloading(
        download,
        "Couldn't get trainingClass data",
        true
      );
    }

    // Obtain the mediaType url to download from
    const media = download.mediaType;
    const mediaUrl =
      trainingClass?.media?.find((item) => item.type === media)?.url ?? null;
    if (!mediaUrl) {
      this.throwErrorDownloading(
        download,
        "URL NOT FOUND FOR THAT MEDIATYPE",
        true
      );
    }

    // This will be used to estimate the total size of downloads
    download.size =
      trainingClass?.media?.find((item) => item.type === media)?.size || null;

    const filename = path.join(
      SettingsData.downloadsPath,
      filenameStealth(download.id, media) // {id}_9879
    );

    const accessToken = AppData.AUTHORIZATION.split(" ")[1];
    let url = `${mediaUrl}&access_token=${accessToken}`;

    // In development we will use a test video to reduce cloudfront usage
    if (process.env.NODE_ENV == "development") {
      url =
        "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
    }

    // START THE DOWNLOAD PROCESS
    const writeStream = fs.createWriteStream(filename);
    const htProtocol = process.env.NODE_ENV === "development" ? http : https;

    this.currentTask = htProtocol
      .get(url, (res) => {
        if (res.statusMessage != "OK") {
          download.retries++;
          this.isDownloading = false;
          this.downloadNext();
          sendToast(
            `Error al descargar clase: ${
              TrainingClassesData.trainingClasses[download.id].title
            }`,
            "error",
            3
          );
          return;
        }

        let received = 0;
        let lastPercentage = 0;
        const totalSize = parseInt(res.headers["content-length"]!);

        // Data received
        res.on("data", (chunk) => {
          received += chunk.length;

          // Log the download peercentage.
          download.progress = (received / totalSize) * 100;
          if (lastPercentage < parseInt(download.progress.toFixed(0))) {
            lastPercentage = parseInt(download.progress.toFixed(0));
            if (lastPercentage % 10 == 0)
              log(download.progress.toFixed(0) + "%");
          }

          for (let i = 0; i < chunk.length; i++) {
            chunk[i] = ~chunk[i];
          }

          const bufferStore = writeStream.write(chunk);

          // Si el buffer está lleno pausamos la descarga
          if (bufferStore === false) {
            res.pause();
          }
        });

        // resume the streaming when emptied
        writeStream.on("drain", () => {
          res.resume();
        });

        res.on("close", () => {
          if (!res.complete) {
            this.throwErrorDownloading(
              download,
              "Download was closed before the completion",
              true
            );
          }

          const isCompleted = received === totalSize;
          if (isCompleted) {
            sendToast(
              `Clase descargada ${
                TrainingClassesData.trainingClasses[download.id].title
              }`
            );
            log("Ended download id: " + download.id + "-" + download.mediaType);
            download.status = "downloaded";
            this.isDownloading = false;
            informDownloadsState();

            // to have a complete trainingClass object
            writeStream.end();
            this.downloadNext();
          }
        });

        res.on("timeout", (err) => {
          logWarn("DOWNLOAD TIMEOUT", err);
        });

        res.on("error", (err) => {
          this.throwErrorDownloading(
            download,
            "Error during the download",
            true,
            [err]
          );
          logError("");
        });

        res.on("abort", (err) => {
          this.throwErrorDownloading(download, "Download aborted", true);
          download.status = "error";
          sendToast("Descarga abortada", "warn", 5);
        });

        res.on("end", () => {
          console.log("Download ended");
          informDownloadsState();
        });
      })
      .on("error", (err) => {
        this.throwErrorDownloading(download, err.toString(), false);
      });
  }

  getFromDb(): void {
    if (!DB.data?.downloads) return;
    this.offlineTrainingClasses = DB.data!.downloads.offlineTrainingClasses;
    this.trainingClassesScheduled = DB.data!.downloads.trainingClassesScheduled;
    this.isDownloading = false;
  }

  saveToDb(): void {
    DB.data!.downloads = {
      offlineTrainingClasses: this.offlineTrainingClasses,
      trainingClassesScheduled: this.trainingClassesScheduled,
      isDownloading: false,
    };
  }

  importFromFolder(folder: string): void {
    // Check if files are download files
    const files = fs.readdirSync(folder);
    sendToast("Iportando clases descargadas", null, 3);
    files.forEach((file) => {
      if (isValidDownloadFile(file)) {
        const source = path.join(folder, file);
        const dest = path.join(SettingsData.downloadsPath, file);

        fs.copyFile(source, dest, fs.constants.COPYFILE_EXCL, (err) => {
          if (err) return;
          const { id, mediaType } = downloadFromFile(file);

          if (!this.offlineTrainingClasses[id + "-" + mediaType]) {
            const offline = new OfflineTrainingClass(id, mediaType);
            offline.status = "downloaded";

            // TODO: add the training class to the TrainingClassesList
            TrainingClassesData.addTraining(id);

            this.offlineTrainingClasses[id + "-" + mediaType] = offline;
          }
        });
      }
    });
    sendToast("Importación finalizada", null, 3);
  }

  removeDownload(id: string, mediaType: mediaType, inform = true): void {
    const file = filenameStealth(id, mediaType);
    if (!id || !mediaType) return;
    const filePath = path.join(SettingsData.downloadsPath, file);
    log(
      `Removing download ${id}-${mediaType} in ${
        url.pathToFileURL(filePath).href
      }`
    );

    const offlineTraining = this.offlineTrainingClasses[id + "-" + mediaType];

    if (offlineTraining.status === "downloaded") {
      fs.rm(filePath, (err) => {
        if (err) {
          logError(
            `Couldn't delete file for download: ${id}-${mediaType}, error: `,
            err
          );
          return;
        }
      });
    }
    this.offlineTrainingClasses[id + "-" + mediaType].downloaded = false;
    this.offlineTrainingClasses[id + "-" + mediaType].status = "none";
    this.offlineTrainingClasses[id + "-" + mediaType].progress = 0;
    this.offlineTrainingClasses[id + "-" + mediaType].size = null;
    this.offlineTrainingClasses[id + "-" + mediaType].retries = 0;

    log(`${id}-${mediaType} was removed successfully`);
    if (inform) informDownloadsState();
  }

  removeAll(): void {
    const files = fs.readdirSync(SettingsData.downloadsPath);
    if (!files.length) {
      sendToast("No hay clases descargadas a eliminar", "warn");
    }
    files.forEach((file, i) => {
      if (!isValidDownloadFile(file)) return;
      const filePath = path.join(SettingsData.downloadsPath, file);
      fs.rm(filePath, (err) => {
        if (err) return;
        const { id, mediaType } = downloadFromFile(file);
        delete this.offlineTrainingClasses[id + "-" + mediaType];

        if (i === files.length - 1) {
          this.saveToDb();
          sendToast("Clases eliminadas", null, 3);
          informDownloadsState();
        }
      });
    });

    this.stopDownloading();
  }

  getDownloading(): OfflineTrainingClass | null {
    return (
      Object.values(this.offlineTrainingClasses).find(
        (v) => v.status === "downloading"
      ) ?? null
    );
  }

  // Returns the offline training that should be most likely to be deleted
  getDeleteCandidate(): OfflineTrainingClass | null {
    const oldest = this.getDownloaded()
      .filter((v) => !!v.timestamp)
      .sort((a, b) => a.timestamp! - b.timestamp!)[0];

    // More than one week without being planned?
    if (oldest.timestamp! + 604800000 < +new Date()) {
      return oldest;
    }
    return null;
  }

  // FIXME: es una mierda, es para adaptar a como estaba en la antigua
  toWebAppState(): downloadsStateWebapp {
    const isDownloading = this.isDownloading;
    const queue = this.getQueued().map((v) => `${v.id}-${v.mediaType}`);
    const downloading = this.getDownloading();

    type tc = {
      id: string;
      downloadedMedia: {
        type: mediaType;
        progress: number;
        downloaded: boolean;
        downloading: boolean;
        queued: boolean;
        url: string;
      }[];
      trainingClass: TrainingClass;
      offline: boolean;
    };

    const trainingClasses = Object.values(this.offlineTrainingClasses).reduce(
      (prev: tc[], v): tc[] => {
        // If the status is "none", the webapp should ignore this download
        if (v.status == "none") return prev;
        const id = v.id.toString();
        const obj = prev.find((item) => item.id === id);
        const mediaToAdd = {
          type: v.mediaType,
          progress:
            v.status === "downloading"
              ? v.progress
              : v.status === "downloaded"
              ? 100
              : 0,
          downloaded: v.status === "downloaded",
          downloading: v.status === "downloading",
          queued: v.status === "queued",
          url: `http://127.0.0.1:$PORT/offline/${filenameStealth(
            id,
            v.mediaType
          )}`,
        };
        if (!obj) {
          return [
            ...prev,
            {
              id,
              downloadedMedia: [mediaToAdd],
              trainingClass: TrainingClassesData.trainingClasses[id] || null,
              offline: v.status === "downloaded",
            },
          ];
        }

        obj.downloadedMedia.push(mediaToAdd);
        return prev;
      },
      []
    );
    return {
      isDownloading,
      queue,
      downloading,
      trainingClasses,
    };
  }

  // Total size of the downloads in GB
  totalDownloadsSize(): number {
    const downloaded = Object.values(this.offlineTrainingClasses).filter(
      (v) => v.status === "downloaded"
    );
    const bytes = downloaded.reduce(
      (prev, v) => prev + (v.size || 500 * 1000000),
      0
    ); // avg size of 500MB
    return bytes / 1000000000;
  }

  // Move the downloads from the current folder to the Downloads folder
  moveDownloadsTo(folder: string): void {
    // Check if files are download files
    const files = fs.readdirSync(SettingsData.downloadsPath);
    sendToast(
      "Iportando clases descargadas, esto podría durar varios minutos... ⏳",
      null,
      3
    );

    files.forEach((file) => {
      if (!isValidDownloadFile(file)) return;

      const source = path.join(SettingsData.downloadsPath, file);
      const dest = path.join(folder, file);

      const { id, mediaType } = downloadFromFile(file);

      fs.copyFile(source, dest, fs.constants.COPYFILE_EXCL, (err) => {
        if (err) {
          delete this.offlineTrainingClasses[id + "-" + mediaType];
          return;
        }
      });
    });

    SettingsData.downloadsPath = folder;
    sendToast("Importación finalizada con éxito", null, 3);
  }
}

// TODO: when a download ends do the fetch of the training class
// to have a complete trainingClass object
export = DownloadsDataModel;
