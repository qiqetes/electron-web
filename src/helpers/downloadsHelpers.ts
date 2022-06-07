import { api, SettingsData } from "./init";
import * as fs from "fs-extra";
import { sendToast } from "./ipcMainActions";

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

// Fetch TrainingClass info with all the parameters (media, progression...)
export const fetchTrainingClass = (id: number | string): void => {
  api
    .fetch(`training_classes_${id}`)
    .then((res: any) => {
      console.log(res);
    })
    .catch((err: any) => console.error(err));
};

export const deleteAllDownloads = () => {
  try {
    fs.emptyDirSync(SettingsData.downloadsPath);
  } catch (err) {
    console.error(err);
    sendToast("Error al borrar las clases descargadas", "error", 3);
  }
};

export const importDownloadFilesFrom = (folder: string) => {
  // if (folder === SettingsData.downloadsPath) {
  //   sendToast("Has seleccionado la proppia carpeta de descargas", "warn", 3);
  //   return;
  // }
  // fs.copy(folder, SettingsData.downloadsPath, function (error) {
  //   if (error) {
  //     console.log(error);
  //     sendToast("Error al importar las clases descargadas", "error", 3);
  //   } else {
  //     sendToast("Clases descargadas importadas", null, 3);
  //   }
  // });
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
