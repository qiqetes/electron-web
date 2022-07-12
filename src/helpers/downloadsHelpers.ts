import { DownloadsData, SettingsData } from "./init";
import * as fs from "fs-extra";
import { sendToast } from "./ipcMainActions";
import path from "path";
import { https } from "follow-redirects";
import { log, logError, logWarn } from "./loggers";

const mediaTypeFileCodes = {
  video_hd: "9783",
  video_sd: "9783",
  audio: "8397",
  music: "7893",
};

export const filenameStealth = (id: number | string, mediaType: mediaType) => {
  return `${id}_${mediaTypeFileCodes[mediaType]}`;
};

// Checks if a TrainingClass object has all the required fields (media, progression...)
export const isCompleteTrainingClass = (tr: TrainingClass): boolean => {
  return !!(tr.media && tr.progression);
};

export const deleteAllDownloads = () => {
  try {
    fs.emptyDirSync(SettingsData.downloadsPath);
  } catch (err) {
    console.error(err);
    sendToast("Error al borrar las clases descargadas", "error", 3);
  }
};

export const isValidDownloadFile = (file: string): boolean => {
  const fileName = file.split("_");
  if (fileName.length < 2) {
    return false;
  }
  // const id = fileName[0];
  const mediaType = fileName[1];
  if (
    mediaType !== mediaTypeFileCodes.video_hd &&
    mediaType !== mediaTypeFileCodes.video_sd &&
    mediaType !== mediaTypeFileCodes.audio &&
    mediaType !== mediaTypeFileCodes.music
  ) {
    return false;
  }
  return true;
};

export const downloadFromFile = (
  file: string
): { id: string; mediaType: mediaType } => {
  const fileName = file.split("_");
  const id = fileName[0];
  const mediaTypeCode = fileName[1];

  const mediaType =
    mediaTypeCode === mediaTypeFileCodes.video_hd
      ? "video_hd"
      : mediaTypeCode === mediaTypeFileCodes.video_sd
      ? "video_sd"
      : mediaTypeCode === mediaTypeFileCodes.audio
      ? "audio"
      : "music";

  return { id, mediaType };
};

export const download = (
  dir: string,
  file: string,
  url: string,
  onDownloadCb?: () => void
) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const filePath = path.join(dir, file);
  const writeStream = fs.createWriteStream(filePath);
  https.get(url, (res) => {
    if (res.statusMessage != "OK")
      logError("Could not download ", file, "from", url);

    log("Downloading file from", url);

    res.pipe(writeStream);

    writeStream.on("finish", () => {
      writeStream.close();
      log("Downloaded:", file);
      if (onDownloadCb) onDownloadCb();
    });
  });
};

/// Downloads Cesar's bike adjustment video
export const downloadHelpVideo = () => {
  log("Downloading adjustment video");

  DownloadsData.isDownloading = true;
  const url =
    "https://apiv2.bestcycling.es/api/v2/media_assets/68688/?type=video_hd";
  const filePath = path.join(SettingsData.downloadsPath, "ajustes.mp4");
  const writeStream = fs.createWriteStream(filePath);

  https.get(url, (res) => {
    if (res.statusMessage != "OK") {
      logError(
        "Couldn't download bike adjustment video, got statusCode:",
        res.statusCode
      );
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
      if (isCompleted) {
        log("Successfully downloaded adjust Video");

        // to have a complete trainingClass object
        writeStream.end();
      }
    });

    res.on("timeout", (err) => {
      logError("Adjust video download timeout", err);
    });

    res.on("error", (err) => {
      logError("Adjust video download error", err);
    });

    res.on("abort", (err) => {
      logWarn("Adjust video download aborted", err);
    });

    res.on("end", () => {
      log("Adjust video download ended");
    });
  });
};
