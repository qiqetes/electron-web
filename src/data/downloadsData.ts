import path = require("path");
import url from "url";
import {
  downloadStatsFromFile,
  filenameStealth,
  isValidDownloadFilename,
} from "../helpers/downloadsHelpers";
import { http, https, RedirectableRequest } from "follow-redirects";
import * as fs from "fs";
import { OfflineTrainingClass } from "../models/offlineTrainingClass";
import { DB, SettingsData, TrainingClassesData } from "../helpers/init";
import {
  informDownloadsState,
  informDownloadState,
  sendToast,
} from "../helpers/ipcMainActions";
import { AppData } from "./appData";
import { log, logError, logWarn } from "../helpers/loggers";

export default class DownloadsDataModel implements DownloadsData {
  offlineTrainingClasses: { [id: string]: OfflineTrainingClass } = {}; // [id: id+"-"+mediaType]

  trainingClassesScheduled: number[] = [];

  isDownloading = false;

  currentTask: RedirectableRequest<any, any> | null = null;

  currentDownload: OfflineTrainingClass | null = null;

  hasAdjustVideo = false;

  /*
   * Found files not registered in database
   */
  unregisteredDownloads: string[] = [];

  constructor() {
    this.init();
    this.initDownloadsPath();
  }

  init() {
    this.offlineTrainingClasses = {};
    this.trainingClassesScheduled = [];
    this.unregisteredDownloads = [];
    this.isDownloading = false;
    this.currentTask = null;
    this.currentDownload = null;
    this.hasAdjustVideo = false;
  }

  /**
   * Adds a download to the queue, inform will send the state to the renderer process
   */
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

    TrainingClassesData.addTrainingClass(dr.trainingClass, false);

    this.offlineTrainingClasses[id + "-" + dr.mediaType] = offlineTrainingClass;

    if (inform) {
      informDownloadsState();
      this.startDownloads();
    }
  }

  /**
   * Creates the default downloads folder if it doesn't exist
   */
  initDownloadsPath() {
    const downloadsPath = SettingsData.downloadsPath;
    fs.mkdirSync(downloadsPath, { recursive: true });
  }

  /**
   * Add multiple downloads to the queue
   */
  addMultipleToQueue(downloadsArray: downloadRequest[]) {
    downloadsArray.forEach((v) => this.addToQueue(v, false));
    this.startDownloads();
    informDownloadsState();
  }

  /**
   * Returns the queued offline trainings
   */
  getQueued(): OfflineTrainingClass[] {
    return Object.values(this.offlineTrainingClasses).filter(
      (v) => v.status === "queued"
    );
  }

  /**
   * Returns the downloaded offline trainings
   */
  getDownloaded(): OfflineTrainingClass[] {
    return Object.values(this.offlineTrainingClasses).filter(
      (v) => v.status === "downloaded"
    );
  }

  /**
   * Gets the download that is currently being downloaded if any
   */
  getDownloading(): OfflineTrainingClass | null {
    return (
      Object.values(this.offlineTrainingClasses).find(
        (v) => v.status === "downloading"
      ) ?? null
    );
  }

  /**
   * Gets the next download to start
   */
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
    log("STARTING DOWNLOADS ⬇️");
    if (!this.hasAdjustVideo) {
      this.downloadHelpVideo();
    }
    this.downloadNext();
  }

  /**
   * Handle the error of a download
   */
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
    download.status = "queued";
    download.retries++;
    if (download.retries >= 5) download.status = "error";
    if (keepDownloading) this.downloadNext();
  }

  /**
   * Call to start the next training class download
   */
  async downloadNext() {
    // Check if already downloading
    if (this.isDownloading) return;
    this.isDownloading = true;

    // Check if there are classes waiting to be downloaded in the queue
    const download = this.getFirstQueued();
    if (!download) {
      logWarn("No media in downloads queue");
      this.isDownloading = false;
      return;
    }
    download.status = "downloading";

    // Check if near the download limit
    const totalDownloadsSize = this.totalDownloadsSize();
    const maxDownloadsSize = SettingsData.maxDownloadsSize;
    if (totalDownloadsSize > maxDownloadsSize * 0.8) {
      logWarn("Downloads limit reached");
      const deleteCandidate = this.getDeleteCandidate();
      if (!deleteCandidate || !AppData.ONLINE) {
        download.status = "queued";
        this.isDownloading = false;
        return;
      }
      log(`Delete candidate ${deleteCandidate.id}`);
      this.removeDownload(deleteCandidate.id, deleteCandidate.mediaType, false);
    }

    this.currentDownload = download;

    // Check that the download hasn't failed already 5 times
    if (download.retries > 5) {
      sendToast("Error al descargar clase", "error", 3);
      download.status = "error";
      this.resumeDownloads();
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
          this.resumeDownloads();
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
            if (lastPercentage % 10 == 0) {
              log(download.progress.toFixed(0) + "%");
              informDownloadState();
            }
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
            return;
          }

          const isCompleted = received === totalSize;
          if (isCompleted) {
            sendToast(
              `Clase descargada ${
                TrainingClassesData.trainingClasses[download.id].title
              }`,
              "success",
              3
            );
            log("Ended download id: " + download.id + "-" + download.mediaType);
            download.status = "downloaded";
            informDownloadsState();

            // to have a complete trainingClass object
            writeStream.end();
            this.resumeDownloads();
          }
        });

        res.on("error", (err) => {
          if (err.message === "aborted") {
            download.status = "none";
            logWarn("Download was aborted");
            sendToast("Descarga cancelada", "warn");
            return;
          }
          this.throwErrorDownloading(
            download,
            "Error during the download",
            true,
            [err]
          );
        });

        res.on("end", () => {
          log("Download ended");
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
    this.hasAdjustVideo = DB.data!.downloads.hasAdjustVideo;
    this.isDownloading = false;
  }

  saveToDb(writeToDb = false): void {
    DB.data!.downloads = {
      offlineTrainingClasses: this.offlineTrainingClasses,
      trainingClassesScheduled: this.trainingClassesScheduled,
      hasAdjustVideo: this.hasAdjustVideo,
      isDownloading: false,
    };

    if (writeToDb) DB.write();
  }

  /**
   * Checks the files in a folder and import those that are download files
   */
  importFromFolder(folder: string): void {
    log("Importing from folder: " + folder);
    // Check if files are download files
    const files = fs.readdirSync(folder);
    const downloadFiles = files.filter((file) => isValidDownloadFilename(file));
    sendToast("Importando clases descargadas", null, 3);

    let imported = 0;
    downloadFiles.forEach((file) => {
      const source = path.join(folder, file);
      const dest = path.join(SettingsData.downloadsPath, file);

      fs.copyFile(source, dest, fs.constants.COPYFILE_EXCL, (err) => {
        imported++;
        if (imported == downloadFiles.length - 1) {
          sendToast("Importación finalizada", null, 3);
        }
        if (err) {
          logError(`Deleting ${file}`, err);
          return;
        }
        log(`Imported ${file}`);

        const downloadedFile = downloadStatsFromFile(file);
        if (downloadedFile === "ajustes") {
          this.hasAdjustVideo = true;
          return;
        }

        const { id, mediaType } = downloadedFile;
        if (!this.offlineTrainingClasses[id + "-" + mediaType]) {
          const offline = new OfflineTrainingClass(
            id,
            mediaType,
            null,
            "downloaded",
            true,
            100
          );
          offline.status = "downloaded";

          // // TODO: add the training class to the TrainingClassesList
          // TrainingClassesData.addTrainingClass(id);

          this.offlineTrainingClasses[id + "-" + mediaType] = offline;
          informDownloadsState();
          this.saveToDb();
        }
      });
    });
  }

  removeDownload(id: string, mediaType: mediaType, inform = true): void {
    const isBeingDownload =
      this.currentDownload?.id === id &&
      this.currentDownload?.mediaType === mediaType;
    if (isBeingDownload) {
      logWarn("Deleted a download that was being downloaded");
      this.stopDownloading();
    }

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
    log("Removing all downloads from " + SettingsData.downloadsPath);

    const files = fs.readdirSync(SettingsData.downloadsPath);

    this.stopDownloading();

    const trainingsFound: string[] = [];
    const downloadFiles = files.filter((file) => isValidDownloadFilename(file));

    if (downloadFiles.length === 0) {
      sendToast("No hay clases descargadas", "warn", 3);
    }

    let nDownloadsDeleted = 0;
    downloadFiles.forEach((file) => {
      const filePath = path.join(SettingsData.downloadsPath, file);
      if (file === "ajustes.mp4") {
        fs.rm(filePath, (err) => {
          nDownloadsDeleted++;
          if (err) {
            logError("Couldn't delete ajustes.mp4", err);
            return;
          }
          log("Ajustes.mp4 deleted");
          this.hasAdjustVideo = false;
        });
        return;
      }

      fs.rm(filePath, (err) => {
        nDownloadsDeleted++;

        if (err) {
          logError("Couldn't delete file: " + file, err);
          return;
        }
        log(`${file} deleted`);

        const download = downloadStatsFromFile(file);
        const { id, mediaType } = download as {
          id: string;
          mediaType: mediaType;
        };
        trainingsFound.push(id + "-" + mediaType);
        delete this.offlineTrainingClasses[id + "-" + mediaType];

        if (nDownloadsDeleted === downloadFiles.length - 1) {
          sendToast("Descargas eliminadas", null, 3);
        }
        this.saveToDb();
        informDownloadsState();
      });
    });

    // Check the offlineTrainingClasses files that had been found coincide
    // with the data stored
    Object.keys(this.offlineTrainingClasses).forEach((key) => {
      if (trainingsFound.includes(key)) return;
      delete this.offlineTrainingClasses[key];
    });
  }

  removeMyTrainingClasses(data: TrainingClass[]) {
    log('Removing training classes...');
    data.forEach(tc => this.removeMyTrainingClass(tc));
  }

  removeMyTrainingClass(tc: TrainingClass) {
    const mediaType: mediaType = 'music';
    const key = tc.id + '-' + mediaType;
    const offlineTc = this.offlineTrainingClasses[key];
    const isFound = !!offlineTc;

    log(`Training class ${tc.id} found: ${isFound}`);

    if (!isFound) return;

    if (offlineTc.status === 'downloading') {
      this.stopDownloading();
    }

    const filename = filenameStealth(tc.id, mediaType);
    const filePath = path.join(SettingsData.downloadsPath, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    log(`Training class ${tc.id} removed`);

    delete this.offlineTrainingClasses[key];
    informDownloadsState();
  }

  /**
   * Returns the offline training that should be most likely to be deleted
   **/
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

  /**
   * Formats the current DownloadsData object to an object understandable
   * by the webapp. This is a temporary solution until the webapp is updated
   */
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

        const trainingClass = TrainingClassesData.trainingClasses[id];
        if (!trainingClass) return prev;

        if (trainingClass.media == null) trainingClass.media = [];

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
      unregisteredDownloads: this.unregisteredDownloads,
      isDownloading,
      queue,
      downloading,
      trainingClasses,
    };
  }

  resumeDownloads(): void {
    this.isDownloading = false;
    this.downloadNext();
  }

  /**
   * Total size of the downloads in GB
   */
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

  /**
   * Move the downloads from the current folder to the Downloads folder
   * */
  moveDownloadsTo(folder: string): void {
    log(
      `Moving download files from ${SettingsData.downloadsPath} to ${folder}`
    );

    // Check if files are download files
    const files = fs.readdirSync(SettingsData.downloadsPath);
    sendToast(
      "Importando clases descargadas, esto podría durar varios minutos...⏳",
      null,
      3
    );

    files.forEach((file) => {
      const downloadsPath = SettingsData.downloadsPath;
      if (!isValidDownloadFilename(file)) return;
      log("Moving file " + file);

      const source = path.join(downloadsPath, file);
      const dest = path.join(folder, file);

      try {
        fs.copyFileSync(source, dest);
      } catch (err) {
        logError("Couldn't copy file " + file, err);

        const donwloadFile = downloadStatsFromFile(file);
        if (donwloadFile === "ajustes") {
          this.hasAdjustVideo = false;
          return;
        }

        const { id, mediaType } = donwloadFile;
        delete this.offlineTrainingClasses[id + "-" + mediaType];
        informDownloadsState();
        return;
      }
      try {
        fs.rmSync(source);
      } catch (err) {
        logError("Couldn't delete file " + file, err);
      }
      // , (err) => {
      //   if (err) {
      //     logError("Couldn't move file " + file, err);

      //     const donwloadFile = downloadStatsFromFile(file);
      //     if (donwloadFile === "ajustes") {
      //       this.hasAdjustVideo = false;
      //       return;
      //     }

      //     const { id, mediaType } = donwloadFile;
      //     delete this.offlineTrainingClasses[id + "-" + mediaType];
      //     informDownloadsState();
      //     return;
      //   }
      //   log(`File ${source} moved to ${dest}`);
      //   fs.unlink(source, (err) => {
      //     logError("Couldn't delete file " + file, err);
      //   });
      // });
    });

    SettingsData.downloadsPath = folder;
    sendToast("Importación finalizada con éxito", null, 3);
  }

  /**
   * Check the folder to see if the download files are really there
   */
  identifyDownloadsInFolder(folder: string): void {
    const files = fs.readdirSync(folder);
    const foundDownloads: string[] = [];
    files.forEach((file) => {
      if (!isValidDownloadFilename(file)) return;

      const download = downloadStatsFromFile(file);
      if (download === "ajustes") {
        // Check the file size
        const sizeAdj = fs.statSync(path.join(folder, file)).size;
        if (sizeAdj < 10000) {
          logError("Adjust video file is too small, corrupt download");
          return;
        }
        this.hasAdjustVideo = true;
        return;
      }

      const { id, mediaType } = download;
      foundDownloads.push(id + "-" + mediaType);
    });

    // Check the offlineTrainingClasses really exist
    Object.keys(this.offlineTrainingClasses).forEach((key) => {
      if (foundDownloads.includes(key)) return;
      // delete this.offlineTrainingClasses[key];
      if (
        this.offlineTrainingClasses[key].status === "downloaded" &&
        !foundDownloads.includes(key)
      ) {
        this.offlineTrainingClasses[key].status = "queued";
      }
    });

    // Generate Offline Downloads
    foundDownloads.forEach((key) => {
      if (this.offlineTrainingClasses[key]) return;

      const id = key.split("-")[0];
      const mediaType = key.split("-")[1] as mediaType;

      log("Adding unregistered download " + key);

      this.offlineTrainingClasses[key] = {
        id: id,
        mediaType: mediaType,
        status: "downloaded",
        progress: 100,
        size: fs.statSync(path.join(folder, filenameStealth(id, mediaType)))
          .size,
        downloaded: true,
        retries: 0,
        timestamp: null,
      };
    });

    // Get training class ids for sync
    const unregisteredDownloads = foundDownloads
      .map((key) => key.split("-")[0])
      .filter((id) => TrainingClassesData.needSyncTrainingClass(id));

    console.info(
      "Tneemos estos archivos sin registro en DB",
      unregisteredDownloads
    );
    this.unregisteredDownloads = unregisteredDownloads;
  }

  /**
   *  Downloads Cesar's bike adjustment video
   **/
  downloadHelpVideo(): void {
    if (!AppData.ONLINE) return;

    this.isDownloading = true;
    const accessToken = AppData.AUTHORIZATION.split(" ")[1];

    if (!accessToken) {
      logWarn("Trying to download help video without access token");
      this.isDownloading = false;
      return;
    }
    // TODO: extraer esta ruta
    const url =
      "https://apiv2.bestcycling.es/api/v2/media_assets/68688/?type=video_hd" +
      `&access_token=${accessToken}`;
    const filePath = path.join(SettingsData.downloadsPath, "ajustes.mp4");

    if (this.hasAdjustVideo) {
      this.isDownloading = false;
      this.downloadNext();
      return;
    }

    log("Downloading adjustment video");

    const writeStream = fs.createWriteStream(filePath);
    https.get(url, (res) => {
      if (res.statusMessage != "OK") {
        logError(
          "Couldn't download bike adjustment video, got statusCode:",
          res.statusCode,
          " from ",
          url
        );
        this.resumeDownloads();
        writeStream.end;
        return;
      }

      let received = 0;
      const totalSize = parseInt(res.headers["content-length"]!);

      // Data received
      res.on("data", (chunk) => {
        received += chunk.length;

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
          logError("Adjust bike video closed before completion");
        }

        const isCompleted = received === totalSize;
        if (!isCompleted) {
          logError("Adjust bike video incomplete");
          this.hasAdjustVideo = false;
          this.resumeDownloads();
        }

        log("Successfully downloaded adjust Video");
        this.hasAdjustVideo = true;
        this.resumeDownloads();
        writeStream.end();
      });

      res.on("error", (err) => {
        logError("Adjust video download error", err);
      });
    });
  }
}
