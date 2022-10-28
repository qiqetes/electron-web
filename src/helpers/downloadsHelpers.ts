import { SettingsData, TrainingClassesData } from "./init";
import * as fs from "fs-extra";
import { informSettingState, sendToast } from "./ipcMainActions";
import path from "path";
import { https } from "follow-redirects";
import { log, logError } from "./loggers";
import { app } from "electron";

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

/**
 * @param file
 * @returns true if the file is a valid download file {id}_{mediaType} or ajustes.mp4
 */
export const isValidDownloadFilename = (file: string): boolean => {
  if (file === "ajustes.mp4") return true;

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

export const downloadStatsFromFile = (
  file: string
): { id: string; mediaType: mediaType } | "ajustes" => {
  if (file === "ajustes.mp4") return "ajustes";

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
  onDownloadCb?: () => void,
  downloadPercentageCb?: (percentage: number) => void
) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  const filePath = path.join(dir, file);
  const writeStream = fs.createWriteStream(filePath);
  https.get(url, (res) => {
    if (res.statusMessage != "OK")
      logError("Could not download ", file, "from", url);

    log("Downloading file from", url);

    const downloadSize = parseInt(res.headers["content-length"] as string);
    let downloaded = 0;
    res.pipe(writeStream);
    if (downloadPercentageCb) {
      let lastPercentage = 0;
      res.addListener("data", (chunk) => {
        downloaded += chunk.length;
        const percentage = Math.round((downloaded / downloadSize) * 100);
        if (Math.floor(percentage) > lastPercentage) {
          downloadPercentageCb(percentage);
          lastPercentage = Math.floor(percentage);
        }
      });
    }

    writeStream.on("finish", () => {
      writeStream.close();
      log("Downloaded:", file);
      if (onDownloadCb) onDownloadCb();
    });
  });
};

// Checks if the downloaded trainingClass has the size specified in the trainingClass object
export const checkCorrectDownloadSize = async (
  file: string,
  folder: string
): Promise<boolean> => {
  // const downloadFile = downloadStatsFromFile(file);
  // if (downloadFile === "ajustes") return true;

  // const { id } = downloadFile;
  // const trainingClass = TrainingClassesDataModel.getFullTraingClass(id);

  // const stats = fs.statSync(filePath);
  // const fileSizeInBytes = stats.size;
  // return fileSizeInBytes === size;
  return true;
};

export const defaultDownloadsPath = () => {
  return path.join(app.getPath("userData"), "Default", "offline");
};

export const downloadSize = (id: string, mediaType: mediaType) => {
  const trainingClass = TrainingClassesData.getTraingClass(id);
  if (!trainingClass) return null;
  const media = trainingClass.media.find((m) => m.type === mediaType);
  if (!media) return null;
  return media.size;
};
