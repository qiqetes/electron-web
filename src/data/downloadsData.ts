import path = require("path");
import {
  downloadFromFile,
  filenameStealth,
  isCompleteTrainingClass,
  isValidDownloadFile,
} from "../helpers/downloadsHelpers";
import { https } from "follow-redirects";
import * as fs from "fs";
import { OfflineTrainingClass } from "../models/offlineTrainingClass";
import { DB, SettingsData, TrainingClassesData } from "../helpers/init";
import { informDownloadsState, sendToast } from "../helpers/ipcMainActions";
import { AppData } from "./appData";

class DownloadsDataModel implements DownloadsData {
  offlineTrainingClasses: { [id: string]: OfflineTrainingClass };
  trainingClassesScheduled: number[] = [];
  isDownloading = false;
  constructor() {
    this.initDownloadsPath();
  }

  addToQueue(
    trainingClass: TrainingClass,
    mediaType: mediaType,
    timestamp?: number,
    inform = true
  ) {
    // Check if already in queue
    if (
      this.offlineTrainingClasses[trainingClass.id] &&
      this.offlineTrainingClasses[trainingClass.id].alreadyQueued(mediaType)
    ) {
      return;
    } else if (this.offlineTrainingClasses[trainingClass.id]) {
    }
    const offlineTrainingClass = new OfflineTrainingClass(
      trainingClass,
      mediaType,
      timestamp
    );

    if (isCompleteTrainingClass(trainingClass)) {
      TrainingClassesData.addTraining(trainingClass.id, false);
    }
    this.offlineTrainingClasses.push(offlineTrainingClass);
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
    this.downloadNext();
    informDownloadsState();
  }

  getQueued(): OfflineTrainingClass[] {
    return this.offlineTrainingClasses.filter(
      (item) =>
        item.statusVideoHd === "queued" ||
        item.statusVideoSd === "queued" ||
        item.statusAudio === "queued" ||
        item.statusMusic === "queued"
    );
  }

  getFirstQueued(): OfflineTrainingClass | null {
    const queuedTrainingClasses = this.getQueued();
    if (!queuedTrainingClasses.length) return null;

    return queuedTrainingClasses.sort((a, b) => a.timeStamp - b.timeStamp)[0];
  }

  stopDownloading(): void {
    this.isDownloading = false;
  }

  startDownloads(): void {
    this.downloadNext();
  }

  async downloadNext() {
    if (this.isDownloading) return;

    const download = this.getFirstQueued();
    if (!download) return;

    // TODO: intentar quitar el await de aquí
    const trainingClass: TrainingClass =
      await TrainingClassesData.getFullTrainingClass(download.id);

    const media = download.getQueuedMediaType();
    const mediaUrl = trainingClass.media.find(
      (item) => item.type === media
    ).url;

    const filename = path.join(
      SettingsData.downloadsPath,
      filenameStealth(download.id, media) // {id}_9879
    );

    const accessToken = AppData.AUTHORIZATION.split(" ")[1];
    const url = `${mediaUrl}&access_token=${accessToken}`;

    this.isDownloading = true;
    const writeStream = fs.createWriteStream(filename);

    https.get(url, (res) => {
      console.log("statusCode:", res.headers);
      let received = 0;
      const totalSize = parseInt(res.headers["content-length"]);

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
        const isCompleted = received === totalSize;
        if (isCompleted) {
          sendToast(`Clase descargada ${download.id}`);
          console.log("Ended download id: " + download.id);
          download.changeStatus(media, "downloaded");
          this.isDownloading = false;

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
        download.changeStatus(media, "error");
      });

      res.on("abort", (err) => {
        this.isDownloading = false;
        console.log(`Error downloading schedule with Id: ${download.id}`, err);
        sendToast("Descarga abortada", "warn", 5);

        download.changeStatus(media, "error");
      });

      res.on("end", () => {
        console.log("Download ended");
        informDownloadsState();
      });
    });
  }

  getFromDb(): void {
    this.offlineTrainingClasses = DB.data.downloads.offlineTrainingClasses.map(
      (v) => OfflineTrainingClass.fromDB(v)
    );
    this.trainingClassesScheduled = DB.data.downloads.trainingClassesScheduled;
  }

  saveToDb(): void {
    DB.data.downloads = this;
  }

  removeAll(): void {
    fs.rm(SettingsData.downloadsPath, (err) => {
      if (err) {
        sendToast("Error al borrar las clases descargadas", "error", 3);
        return;
      }
      this.offlineTrainingClasses = [];
      this.trainingClassesScheduled = [];
    });
  }

  importFromFolder(folder: string): void {
    // Check if files are download files
    const files = fs.readdirSync(folder);
    files.forEach((file) => {
      if (isValidDownloadFile(file)) {
        const { id, mediaType } = downloadFromFile(file);

        if (!this.offlineTrainingClasses.find((item) => item.id === id)) {
          const offline = new OfflineTrainingClass(id, mediaType);
          offline.changeStatus(mediaType, "downloaded");

          // TODO: add the training class to the TrainingClassesList
          TrainingClassesData.addTraining(id);

          this.offlineTrainingClasses.push(offline);
        }
      }
    });
  }

  getDownloading(): OfflineTrainingClass {
    return this.offlineTrainingClasses.find(
      (item) =>
        item.statusVideoHd === "downloading" ||
        item.statusVideoSd === "downloading" ||
        item.statusAudio === "downloading" ||
        item.statusMusic === "downloading"
    );
  }

  // TODO: es una mierda, es para adaptar a como estaba en la antigua
  toWebAppState(): downloadsStateWebapp {
    const isDownloading = this.isDownloading;
    const queue = this.getQueued().map(
      (v) => `${v.id}-${v.getQueuedMediaType()}`
    );
    const downloading = this.getDownloading();
    const trainingClasses = this.offlineTrainingClasses.map((v) => {
      const id = v.id.toString();
      const downloadedMedia = [
        {
          type: "video_hd" as mediaType,
          progress:
            v.statusVideoHd === "downloading"
              ? v.progress
              : v.statusVideoHd === "downloaded"
              ? 100
              : 0,
          downloaded: v.statusVideoHd === "downloaded",
          downloading: v.statusVideoHd === "downloading",
          queued: v.statusVideoHd === "queued",
        },
        {
          type: "video_sd" as mediaType,
          progress:
            v.statusVideoSd === "downloading"
              ? v.progress
              : v.statusVideoSd === "downloaded"
              ? 100
              : 0,
          downloaded: v.statusVideoSd === "downloaded",
          downloading: v.statusVideoSd === "downloading",
          queued: v.statusVideoSd === "queued",
        },
        {
          type: "audio" as mediaType,
          progress:
            v.statusAudio === "downloading"
              ? v.progress
              : v.statusAudio === "downloaded"
              ? 100
              : 0,
          downloaded: v.statusAudio === "downloaded",
          downloading: v.statusAudio === "downloading",
          queued: v.statusAudio === "queued",
        },
        {
          type: "music" as mediaType,
          progress:
            v.statusMusic === "downloading"
              ? v.progress
              : v.statusMusic === "downloaded"
              ? 100
              : 0,
          downloaded: v.statusMusic === "downloaded",
          downloading: v.statusMusic === "downloading",
          queued: v.statusMusic === "queued",
        },
      ];
      const trainingClass = TrainingClassesData.trainingClasses[id];
      const offline =
        v.statusAudio === "downloaded" ||
        v.statusMusic === "downloaded" ||
        v.statusVideoHd === "downloaded" ||
        v.statusVideoSd === "downloaded";
      return {
        id,
        offline,
        downloadedMedia,
        trainingClass,
      };
    });
    return {
      isDownloading,
      queue,
      downloading,
      trainingClasses,
    };
  }
}

// TODO: when a download ends do the fetch of the training class
// to have a complete trainingClass object
export = DownloadsDataModel;
