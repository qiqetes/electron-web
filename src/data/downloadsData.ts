import path = require("path");
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

class DownloadsDataModel implements DownloadsData {
  offlineTrainingClasses: { [id: string]: OfflineTrainingClass } = {}; // [id: id+"-"+mediaType]
  trainingClassesScheduled: number[] = [];
  isDownloading = false;
  currentTask: RedirectableRequest<any, any> | null = null;

  constructor() {
    this.initDownloadsPath();
  }

  addToQueue(
    trainingClass: TrainingClass,
    mediaType: mediaType,
    timestamp: number | null = null,
    inform = true
  ) {
    // Check if already in queue
    const offlineTraining =
      this.offlineTrainingClasses[trainingClass.id + "-" + mediaType];
    const status = offlineTraining?.status;
    if (offlineTraining && status === "none") {
      offlineTraining.status = "queued";
    } else if (offlineTraining) {
      return;
    }

    const id = trainingClass.id.toString();
    const offlineTrainingClass = new OfflineTrainingClass(
      id,
      mediaType,
      timestamp
    );

    TrainingClassesData.addTraining(trainingClass, false);

    this.offlineTrainingClasses[id + "-" + mediaType] = offlineTrainingClass;
    if (inform) informDownloadsState();
  }

  initDownloadsPath() {
    const downloadsPath = SettingsData.downloadsPath;
    fs.mkdirSync(downloadsPath, { recursive: true });
  }

  addMultipleToQueue(downloadsArray: downloadRequest[]) {
    downloadsArray.forEach((v) =>
      this.addToQueue(v.trainingClass, v.mediaType, v.timestamp, false)
    );
    this.startDownloads();
    informDownloadsState();
  }

  getQueued(): OfflineTrainingClass[] {
    return Object.values(this.offlineTrainingClasses).filter(
      (v) => v.status === "queued"
    );
  }

  getFirstQueued(): OfflineTrainingClass | null {
    const queuedTrainingClasses = this.getQueued();
    if (!queuedTrainingClasses.length) return null;

    return Object.values(queuedTrainingClasses).sort(
      (a, b) => (a?.timestamp || 0) - (b?.timestamp || 0)
    )[0];
  }

  stopDownloading(): void {
    this.isDownloading = false;
    if (this.currentTask) this.currentTask.abort();
  }

  startDownloads(): void {
    console.log("STARTING DOWNLOADS ⬇️");
    this.downloadNext();
  }

  async downloadNext() {
    if (this.isDownloading) return;

    const download = this.getFirstQueued();
    if (!download) return;
    if (download.retries > 5) {
      sendToast("Error al descargar clase", "error", 3);
      download.status = "error";
    }

    // TODO: intentar quitar el await de aquí
    const trainingClass: TrainingClass | null =
      await TrainingClassesData.getFullTrainingClass(download.id);

    if (!trainingClass) {
      download.retries++;
      this.downloadNext();
      return;
    }

    const media = download.mediaType;
    const mediaUrl =
      trainingClass?.media?.find((item) => item.type === media)?.url ?? null;
    if (!mediaUrl) throw new Error("URL NOT FOUND FOR THAT MEDIATYPE");
    download.size =
      trainingClass?.media?.find((item) => item.type === media)?.size || null;

    const filename = path.join(
      SettingsData.downloadsPath,
      filenameStealth(download.id, media) // {id}_9879
    );

    const accessToken = AppData.AUTHORIZATION.split(" ")[1];
    let url = `${mediaUrl}&access_token=${accessToken}`;
    if (process.env.NODE_EN == "dev")
      url = "http://127.0.0.1:3000/mock_video.mp4"; // TODO: remember to remove this and switch back to https

    if (this.isDownloading) return;
    this.isDownloading = true;

    const writeStream = fs.createWriteStream(filename);

    const htProtocol = process.env.NODE_ENV === "prod" ? https : http;
    this.currentTask = htProtocol.get(url, (res) => {
      if (res.statusMessage != "OK") {
        download.retries++;
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
      const totalSize = parseInt(res.headers["content-length"]!);

      let nChunks = 0;
      // Data received
      res.on("data", (chunk) => {
        received += chunk.length;
        download.progress = (received / totalSize) * 100;
        if (received % 1000000 === 0) {
          console.log(download.progress);
        }

        for (let i = 0; i < chunk.length; i += 1) {
          chunk[i] = ~chunk[i];
        }

        const bufferStore = writeStream.write(chunk);

        nChunks += 1;
        if (nChunks % 500 === 0) console.log(download.progress + "%");

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
          download.retries++;
          this.downloadNext();
          sendToast("Error al descargar clase", "error", 3);
          return;
        }
        const isCompleted = received === totalSize;

        if (isCompleted) {
          sendToast(
            `Clase descargada ${
              TrainingClassesData.trainingClasses[download.id].title
            }`
          );
          console.log("Ended download id: " + download.id);
          download.status = "downloaded";
          this.isDownloading = false;
          informDownloadsState();

          // TODO: when a download ends do the fetch of the training class
          // to have a complete trainingClass object
          writeStream.end();
          this.downloadNext();
        }
      });

      res.on("timeout", (err) => {
        this.isDownloading = false;
        console.log("DOWNLOAD TIMEOUT", err);
      });

      res.on("error", (err) => {
        this.isDownloading = false;
        console.log(`Error downloading schedule with Id: ${download.id}`, err);
        sendToast("Error en la descarga", "warn", 5);

        // TODO: handle retries
        // if(download.retries < 5){
        //   download.retries += 1
        // }
        download.status = "error";
      });

      res.on("abort", (err) => {
        this.isDownloading = false;
        console.log(`Error downloading schedule with Id: ${download.id}`, err);
        sendToast("Descarga abortada", "warn", 5);

        download.status = "error";
      });

      res.on("end", () => {
        console.log("Download ended");
        informDownloadsState();
      });
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
    fs.rm(filePath, (err) => {
      if (err) return;
      this.offlineTrainingClasses[id + "-" + mediaType].downloaded = false;
      this.offlineTrainingClasses[id + "-" + mediaType].status = "none";
      this.offlineTrainingClasses[id + "-" + mediaType].progress = 0;
      this.offlineTrainingClasses[id + "-" + mediaType].size = null;
      this.offlineTrainingClasses[id + "-" + mediaType].retries = 0;
      if (inform) informDownloadsState();
    });
  }

  removeAll(): void {
    const files = fs.readdirSync(SettingsData.downloadsPath);
    files.forEach((file) => {
      if (!isValidDownloadFile(file)) return;
      const filePath = path.join(SettingsData.downloadsPath, file);
      fs.rm(filePath, (err) => {
        if (err) return;
        const { id, mediaType } = downloadFromFile(file);
        delete this.offlineTrainingClasses[id + "-" + mediaType];
      });
    });

    this.stopDownloading();
    informDownloadsState();
    this.saveToDb();
    sendToast("Clases eliminadas", null, 3);
  }

  getDownloading(): OfflineTrainingClass | null {
    return (
      Object.values(this.offlineTrainingClasses).find(
        (v) => v.status === "downloading"
      ) ?? null
    );
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
        const id = v.id.toString();
        const obj = prev.find((item) => item.id === id);
        if (obj) {
          obj.downloadedMedia.push({
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
          });
          return prev;
        } else {
          return [
            ...prev,
            {
              id,
              downloadedMedia: [
                {
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
                },
              ],
              trainingClass: TrainingClassesData.trainingClasses[id] || null,
              offline: v.status === "downloaded",
            },
          ];
        }
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
