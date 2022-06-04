import { api } from "./init";

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
