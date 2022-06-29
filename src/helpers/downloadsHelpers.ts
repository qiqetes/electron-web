import { SettingsData } from "./init";
import * as fs from "fs-extra";
import { sendToast } from "./ipcMainActions";
import path from "path";
import { https } from "follow-redirects";
import { log, logError } from "./loggers";

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
      logError("Could not get the new version from the s3");

    log("Downloading file from", url);

    res.pipe(writeStream);

    writeStream.on("finish", () => {
      writeStream.close();
      log("FINISHED UPDATE DOWNLOAD");
      if (onDownloadCb) onDownloadCb();
    });
  });
};
