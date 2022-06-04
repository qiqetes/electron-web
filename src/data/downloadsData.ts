import path = require("path");
import {
  filenameStealth,
  isCompleteTrainingClass,
} from "../helpers/downloadsHelpers";
import { AppData } from "./appData";
import { SettingsData } from "./settingsData";
import * as fs from "fs";
import * as https from "node:https";
import { mainWindow } from "..";
import { OfflineTrainingClass } from "../models/offlineTrainingClass";
import { TrainingClassesData } from "./trainingClassesData";
import { DB } from "../helpers/init";

class DownloadsDataModel implements DownloadsData {
  offlineTrainingClasses: OfflineTrainingClass[] = [];
  trainingClassesScheduled: number[] = [];
  isDownloading = false;

  addToQueue(
    trainingClass: TrainingClass,
    mediaType: mediaType,
    timestamp?: number
  ) {
    // Check if already in queue
    if (
      this.offlineTrainingClasses.find((item) => item.id === trainingClass.id)
    )
      return;

    const offlineTrainingClass = new OfflineTrainingClass(
      trainingClass,
      mediaType,
      timestamp
    );

    if (isCompleteTrainingClass(trainingClass)) {
      TrainingClassesData.trainingClasses.push(trainingClass);
    } else {
      // TrainingClass needs to be fetched
    }
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
    const media = download.getQueuedMediaType();

    const filename = path.join(
      SettingsData.downloadsPath,
      filenameStealth(download.id, media)
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
        "Content-Type": "video/mp4", // TODO:
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
        mainWindow.webContents.send("toast", "Error en la descarga", "warn", 5);

        // TODO: handle retries
        // if(download.retries < 5){
        //   download.retries += 1

        // }
        download.changeStatus(media, "error");
      });

      res.on("abort", (err) => {
        this.isDownloading = false;
        console.log(`Error downloading schedule with Id: ${download.id}`, err);
        mainWindow.webContents.send("toast", "Descarga abortada", "warn", 5);

        download.changeStatus(media, "error");
      });

      res.on("end", () => {
        console.log("Ended download id: " + download.id);
        mainWindow.webContents.send("toast", "Clase descargada");

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
        mainWindow.webContents.send(
          "toast",
          "Error al borrar las clases descargadas",
          "error",
          3
        );
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

export const DownloadsData = new DownloadsDataModel();
