import path = require("path");
import {
  filenameStealth,
  isCompleteTrainingClass,
} from "../helpers/downloadsHelpers";
import { AppData } from "./appData";
import * as fs from "fs";
import * as https from "node:https";
import { OfflineTrainingClass } from "../models/offlineTrainingClass";

import { DB, SettingsData, TrainingClassesData } from "../helpers/init";
import { sendToast } from "../helpers/ipcMainActions";

class DownloadsDataModel implements DownloadsData {
  offlineTrainingClasses: OfflineTrainingClass[] = [];
  trainingClassesScheduled: number[] = [];
  isDownloading = false;
  constructor() {
    this.initDownloadsPath();
  }

  addToQueue(
    trainingClass: TrainingClass,
    mediaType: mediaType,
    timestamp?: number
  ) {
    // Check if already in queue
    if (
      this.offlineTrainingClasses.find((item) => item.id === trainingClass.id)
    ) {
      return;
    }

    const offlineTrainingClass = new OfflineTrainingClass(
      trainingClass,
      mediaType,
      timestamp
    );

    if (isCompleteTrainingClass(trainingClass)) {
      TrainingClassesData.trainingClasses.push(trainingClass);
    }
    // TODO: TrainingClass will need to be fetched
    this.offlineTrainingClasses.push(offlineTrainingClass);
  }

  initDownloadsPath() {
    const downloadsPath = SettingsData.downloadsPath;
    if (!fs.existsSync(downloadsPath)) {
      fs.mkdirSync(downloadsPath);
    }
  }

  addMultipleToQueue(downloadsArray: downloadRequest[]) {
    downloadsArray.forEach((v) =>
      this.addToQueue(v.trainingClass, v.mediaType, v.timestamp)
    );
    this.downloadNext();
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

  getFirstQueued: () => OfflineTrainingClass | null = () => {
    const queuedTrainingClasses = this.getQueued();
    if (!queuedTrainingClasses.length) return null;

    return queuedTrainingClasses.sort((a, b) => a.timeStamp - b.timeStamp)[0];
  };

  stopDownloading: () => void = () => {
    this.isDownloading = false;
  };

  startDownloads: () => void = () => {
    this.downloadNext();
  };

  downloadNext: () => void = () => {
    if (this.isDownloading) return;

    const download = this.getFirstQueued();
    if (!download) return;

    const media = download.getQueuedMediaType();

    const filename = path.join(
      SettingsData.downloadsPath,
      filenameStealth(download.id, media) // {id}_9879
    );

    const accessToken = AppData.AUTHORIZATION.replace("Bearer ", "");
    const url = `/training_classes/${download.id}/download?type=${media}&player=app_preloading&access_token=${accessToken}`;

    const options = {
      host: "api.bestcycling.es",
      port: 443,
      method: "GET",
      path: "/api/bestapp" + url,
      headers: {
        "X-APP-ID": AppData.APPID,
        "X-APP-VERSION": AppData.XAPPID,
        "Content-Type": "video/mp4", // TODO: change depending on audio/video/...
      },
    };

    this.isDownloading = true;
    const writeStream = fs.createWriteStream(filename);
    https.get(options, (res) => {
      let received = 0;
      const totalSize = parseInt(res.headers["content-length"]);

      let nChunks = 0;
      // Data received
      res.on("data", (chunk) => {
        received += chunk.length;
        download.progress = (received / totalSize) * 100;

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
        this.isDownloading = false;
        console.log("DOWNLOAD CLOSED");
        // TODO:
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
        console.log("Ended download id: " + download.id);

        // TODO: when a download ends do the fetch of the training class
        // to have a complete trainingClass object
        sendToast("Clase descargada");

        writeStream.end();

        download.changeStatus(media, "downloaded");
        this.isDownloading = false;
        this.downloadNext();
      });
    });
  };

  getFromDb: () => void = () => {
    this.offlineTrainingClasses = DB.data.downloads.offlineTrainingClasses;
    this.trainingClassesScheduled = DB.data.downloads.trainingClassesScheduled;
  };

  saveToDb: () => void = () => {
    DB.data.downloads = this;
  };

  removeAll: () => void = () => {
    fs.rm(SettingsData.downloadsPath, (err) => {
      if (err) {
        sendToast("Error al borrar las clases descargadas", "error", 3);
        return;
      }
      this.offlineTrainingClasses = [];
      this.trainingClassesScheduled = [];
    });
  };

  importFromFolder: (folder: string) => void = (folder) => {
    throw new Error("Method not implemented.");
  };
}

// TODO: when a download ends do the fetch of the training class
// to have a complete trainingClass object
export = DownloadsDataModel;
